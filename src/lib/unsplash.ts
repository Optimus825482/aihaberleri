import axios from "axios";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = "https://api.unsplash.com";

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
  };
}

/**
 * Search for images on Unsplash
 */
export async function searchUnsplashImages(
  query: string,
  perPage: number = 10,
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("⚠️  UNSPLASH_ACCESS_KEY is not set");
    return [];
  }

  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
      params: {
        query,
        per_page: perPage,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    return response.data.results || [];
  } catch (error) {
    console.error("Unsplash API Error:", error);
    return [];
  }
}

/**
 * Get a random image from Unsplash
 */
export async function getRandomUnsplashImage(
  query: string,
): Promise<UnsplashImage | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("⚠️  UNSPLASH_ACCESS_KEY is not set");
    return null;
  }

  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/photos/random`, {
      params: {
        query,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Unsplash API Error:", error);
    return null;
  }
}

/**
 * Get image for AI news article
 */
export async function getAINewsImage(): Promise<string | null> {
  const queries = [
    "artificial intelligence",
    "machine learning",
    "neural network",
    "robot",
    "technology",
    "computer science",
  ];

  // Try random query
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  const image = await getRandomUnsplashImage(randomQuery);

  if (image) {
    return image.urls.regular;
  }

  // Fallback: search
  const images = await searchUnsplashImages(randomQuery, 5);
  if (images.length > 0) {
    const randomImage = images[Math.floor(Math.random() * images.length)];
    return randomImage.urls.regular;
  }

  return null;
}

export default {
  searchUnsplashImages,
  getRandomUnsplashImage,
  getAINewsImage,
};
