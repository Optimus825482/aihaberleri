"""
🎙️ AI Haberleri - Otomatik Podcast Üretici (Modal.com)

Modal.com ücretsiz GPU ile yüksek kaliteli podcast üretir.
Ayda 30$ kredi ücretsiz - yaklaşık 100+ podcast yeterli!

Kurulum:
1. pip install modal
2. modal token new
3. modal run podcast_modal.py

Zamanlanmış çalıştırma:
- modal deploy podcast_modal.py
- Günlük 08:00 ve 18:00'da otomatik çalışır
"""

import modal
import os
from datetime import datetime

# Modal App tanımla
app = modal.App("aihaberleri-podcast")

# Docker image - TTS bağımlılıkları ile
image = modal.Image.debian_slim(python_version="3.10").pip_install(
    "TTS==0.22.0",
    "torch",
    "torchaudio", 
    "requests",
    "pydub",
).apt_install(
    "ffmpeg",
    "libsndfile1",
)

# GPU Volume - Model cache için
volume = modal.Volume.from_name("tts-model-cache", create_if_missing=True)

@app.function(
    image=image,
    gpu="T4",  # Ücretsiz T4 GPU
    timeout=600,  # 10 dakika
    volumes={"/cache": volume},
    secrets=[modal.Secret.from_name("aihaberleri-api")],  # Opsiyonel
)
def generate_podcast(
    text: str = None,
    api_url: str = "https://aihaberleri.org/api/articles",
    voice_url: str = None,
    num_articles: int = 5,
) -> bytes:
    """
    Podcast ses dosyası üret
    
    Args:
        text: Direkt metin (opsiyonel)
        api_url: Haber API URL'i
        voice_url: Referans ses URL'i (voice cloning için)
        num_articles: Kaç haber alınacak
    
    Returns:
        MP3 bytes
    """
    import torch
    from TTS.api import TTS
    import requests
    import tempfile
    import subprocess
    
    print(f"🚀 GPU: {torch.cuda.get_device_name(0)}")
    
    # 1. Haberleri çek veya metin kullan
    if text is None:
        text = fetch_news_and_create_script(api_url, num_articles)
    
    print(f"📝 Script uzunluğu: {len(text)} karakter")
    
    # 2. XTTS v2 modelini yükle (cache'den)
    os.environ["COQUI_TOS_AGREED"] = "1"
    cache_dir = "/cache/tts_models"
    os.makedirs(cache_dir, exist_ok=True)
    os.environ["TTS_HOME"] = cache_dir
    
    print("🎤 XTTS v2 yükleniyor...")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    
    # 3. Referans ses dosyası
    ref_audio = get_reference_audio(voice_url)
    
    # 4. Ses üret
    print("🔊 Ses üretiliyor...")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name
    
    tts.tts_to_file(
        text=text,
        file_path=wav_path,
        speaker_wav=ref_audio,
        language="tr",
        split_sentences=True
    )
    
    # 5. MP3'e dönüştür
    mp3_path = wav_path.replace(".wav", ".mp3")
    subprocess.run([
        "ffmpeg", "-y", "-i", wav_path,
        "-codec:a", "libmp3lame", "-qscale:a", "2",
        mp3_path
    ], check=True, capture_output=True)
    
    # 6. Bytes olarak döndür
    with open(mp3_path, "rb") as f:
        mp3_bytes = f.read()
    
    # Temizlik
    os.unlink(wav_path)
    os.unlink(mp3_path)
    if ref_audio != "/cache/reference_voice.wav":
        os.unlink(ref_audio)
    
    print(f"✅ Podcast hazır! Boyut: {len(mp3_bytes) / 1024 / 1024:.2f} MB")
    return mp3_bytes


def fetch_news_and_create_script(api_url: str, limit: int) -> str:
    """API'den haberleri çek ve script oluştur"""
    import requests
    from datetime import datetime
    
    today = datetime.now().strftime("%d %B %Y")
    
    try:
        response = requests.get(f"{api_url}?limit={limit}&status=PUBLISHED", timeout=30)
        if response.status_code == 200:
            data = response.json()
            articles = data.get('articles', data) if isinstance(data, dict) else data
            
            script = f"""Merhaba, AI Haberleri podcast'ine hoş geldiniz. 
Ben yapay zeka asistanınız. Bugün {today}, sizler için günün en önemli yapay zeka haberlerini derledim.

"""
            for i, article in enumerate(articles[:limit], 1):
                title = article.get('title', '')
                summary = article.get('summary', article.get('content', ''))[:400]
                script += f"""Haber {i}: {title}.
{summary}

"""
            
            script += """Bu günkü haberlerimiz bu kadardı. 
Bizi dinlediğiniz için teşekkür ederiz. Yarın yeni haberlerle tekrar görüşmek üzere, hoşça kalın!"""
            
            return script
    except Exception as e:
        print(f"API Hatası: {e}")
    
    # Fallback metin
    return f"""Merhaba, AI Haberleri podcast'ine hoş geldiniz.
Bugün {today}. Yapay zeka dünyasından önemli gelişmeleri sizlerle paylaşacağız.
Detaylı haberler için web sitemizi ziyaret edebilirsiniz.
Hoşça kalın!"""


def get_reference_audio(voice_url: str = None) -> str:
    """Referans ses dosyasını hazırla"""
    import requests
    import subprocess
    
    cache_path = "/cache/reference_voice.wav"
    
    # Cache'de varsa kullan
    if os.path.exists(cache_path) and voice_url is None:
        return cache_path
    
    # URL varsa indir
    if voice_url:
        import tempfile
        temp_path = tempfile.mktemp(suffix=".ogg")
        response = requests.get(voice_url)
        with open(temp_path, "wb") as f:
            f.write(response.content)
        
        # WAV'a dönüştür
        output_path = tempfile.mktemp(suffix=".wav")
        subprocess.run([
            "ffmpeg", "-y", "-i", temp_path,
            "-ar", "22050", "-ac", "1", output_path
        ], check=True, capture_output=True)
        os.unlink(temp_path)
        return output_path
    
    # Varsayılan Türkçe ses
    default_url = "https://upload.wikimedia.org/wikipedia/commons/8/8e/Tr-Merhaba.ogg"
    temp_ogg = "/tmp/temp_voice.ogg"
    
    response = requests.get(default_url)
    with open(temp_ogg, "wb") as f:
        f.write(response.content)
    
    subprocess.run([
        "ffmpeg", "-y", "-i", temp_ogg,
        "-ar", "22050", "-ac", "1", cache_path
    ], check=True, capture_output=True)
    
    return cache_path


@app.function(
    image=image,
    schedule=modal.Cron("0 5,15 * * *"),  # Her gün 08:00 ve 18:00 (UTC+3)
    secrets=[modal.Secret.from_name("aihaberleri-api")],
)
def scheduled_podcast():
    """Zamanlanmış podcast üretimi"""
    import requests
    from datetime import datetime
    
    print(f"⏰ Zamanlanmış çalışma: {datetime.now()}")
    
    # Podcast üret
    mp3_bytes = generate_podcast.remote()
    
    # Sunucuya yükle (opsiyonel)
    upload_url = os.environ.get("PODCAST_UPLOAD_URL")
    api_key = os.environ.get("PODCAST_API_KEY")
    
    if upload_url and api_key:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        files = {"file": (f"podcast_{timestamp}.mp3", mp3_bytes, "audio/mpeg")}
        headers = {"Authorization": f"Bearer {api_key}"}
        
        response = requests.post(upload_url, files=files, headers=headers)
        print(f"📤 Yükleme sonucu: {response.status_code}")
    else:
        print("⚠️ Upload URL tanımlı değil, sadece üretildi.")
    
    return True


@app.local_entrypoint()
def main(
    text: str = None,
    output: str = "podcast.mp3",
    articles: int = 5,
):
    """
    Lokal çalıştırma
    
    Kullanım:
        modal run podcast_modal.py
        modal run podcast_modal.py --text "Merhaba dünya"
        modal run podcast_modal.py --output my_podcast.mp3 --articles 10
    """
    print("🎙️ AI Haberleri Podcast Üretici")
    print("=" * 40)
    
    # Remote fonksiyonu çağır
    mp3_bytes = generate_podcast.remote(
        text=text,
        num_articles=articles,
    )
    
    # Dosyaya kaydet
    with open(output, "wb") as f:
        f.write(mp3_bytes)
    
    print(f"\n✅ Podcast kaydedildi: {output}")
    print(f"📏 Boyut: {len(mp3_bytes) / 1024 / 1024:.2f} MB")


# Deploy komutu:
# modal deploy podcast_modal.py
# 
# Test komutu:
# modal run podcast_modal.py
