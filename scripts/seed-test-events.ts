#!/usr/bin/env bun

/**
 * Seed script to generate 343 random test events for load testing
 * Events will be dated from March 2026 to July 2026
 * Positioned randomly across Sudan
 * 
 * Note: This script requires authentication to the backend API.
 * Make sure you're logged in and have a valid session.
 */

const API_URL = process.env.API_URL || "http://localhost:4000";
const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;
const TOTAL_EVENTS = 343;

// Sudan bounding box (approximate)
const SUDAN_BOUNDS = {
  minLat: 8.5,
  maxLat: 22.0,
  minLng: 21.8,
  maxLng: 38.6,
};

// Event types (GLIDE codes)
const EVENT_TYPES = ["FL", "TC", "EQ", "DR", "EP", "FF", "ST", "VO", "CW"];

// Severity levels
const SEVERITIES = ["low", "moderate", "high", "severe", "critical"];

// Random descriptions
const EVENT_TITLES = [
  "Flooding in region",
  "Displacement reported",
  "Infrastructure damage",
  "Emergency response needed",
  "Humanitarian crisis",
  "Resource shortage",
  "Population affected",
  "Services disrupted",
  "Emergency declared",
  "Relief efforts ongoing",
];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function checkExistingEvents() {
  const query = `
    query GetEvents {
      events {
        id
        title
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error("GraphQL error:", data.errors);
      return null;
    }

    return data.data.events;
  } catch (error) {
    console.error("Failed to fetch existing events:", error);
    return null;
  }
}

async function main() {
  console.log(`🌱 Starting seed script: checking backend connectivity...`);
  console.log(`📍 API URL: ${GRAPHQL_ENDPOINT}`);
  console.log(`📅 Target: ${TOTAL_EVENTS} test events from March 1 - July 14, 2026`);
  console.log(`🗺️  Location: Sudan (random coordinates)\n`);

  // First, check if we can connect to the backend
  console.log("Checking existing events...");
  const existingEvents = await checkExistingEvents();
  
  if (existingEvents === null) {
    console.error("\n❌ Cannot connect to the backend API.");
    console.error("Please make sure:");
    console.error("  1. The backend server is running (clear-api)");
    console.error("  2. You have the correct API_URL in .env.local");
    console.error("  3. The GraphQL endpoint is accessible\n");
    process.exit(1);
  }

  console.log(`✓ Found ${existingEvents.length} existing events\n`);
  
  console.error("⚠️  Event creation through GraphQL requires authentication.");
  console.error("Please use the backend seed scripts in the clear-api repository instead.");
  console.error("\nAlternatively, you can:");
  console.error("  1. Create events manually through the UI");
  console.error("  2. Import events from a CSV file");
  console.error("  3. Run backend seed scripts directly\n");
  
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
