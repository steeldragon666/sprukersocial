import { invokeLLM } from './_core/llm';
import { generateImage } from './_core/imageGeneration';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Content categories with distribution
 */
const CONTENT_CATEGORIES = {
  policy: {
    weight: 0.3,
    topics: [
      'Australian government renewable energy policy updates and ARENA funding announcements',
      'SAF mandates and aviation fuel regulations in Australia',
      'Bioenergy policy frameworks and government incentives',
      'Net-zero commitments and carbon reduction targets',
      'Clean energy investment policies and tax incentives',
      'Renewable energy infrastructure development programs',
      'Government partnerships with clean energy companies',
      'Australian Renewable Energy Agency (ARENA) project approvals'
    ]
  },
  technology: {
    weight: 0.3,
    topics: [
      'Battery technology breakthroughs and energy storage innovations',
      'Sustainable Aviation Fuel production methods and efficiency improvements',
      'Electrification advances in transportation and industry',
      'Bamboo biomass conversion technologies for SAF',
      'Next-generation biofuel refining processes',
      'Graphite production from sustainable sources',
      'Green hydrogen technology and applications',
      'Carbon capture and utilization innovations'
    ]
  },
  environmental: {
    weight: 0.3,
    topics: [
      'Climate impact of sustainable aviation fuels',
      'Carbon emission reduction success stories',
      'Biodiversity benefits of bamboo cultivation',
      'Circular economy in renewable energy',
      'Ocean and atmosphere protection through clean energy',
      'Wildlife conservation and renewable energy coexistence',
      'Sustainable agriculture and bioenergy integration',
      'Climate change mitigation through innovation'
    ]
  },
  trending: {
    weight: 0.1,
    topics: [
      'Viral renewable energy innovations',
      'Trending clean tech startups and breakthroughs',
      'Popular sustainability challenges and movements',
      'Influencer collaborations in clean energy space'
    ]
  }
};

/**
 * Hashtag sets by category
 */
const HASHTAG_SETS = {
  policy: [
    '#RenewablePolicy', '#CleanEnergyPolicy', '#ARENA', '#AustralianEnergy',
    '#GovtInitiatives', '#EnergyTransition', '#ClimatePolicy', '#NetZeroAustralia'
  ],
  technology: [
    '#CleanTech', '#GreenTech', '#EnergyInnovation', '#SustainableTech',
    '#BatteryTech', '#SAFTechnology', '#Electrification', '#FutureFuels'
  ],
  environmental: [
    '#Sustainability', '#ClimateAction', '#GreenFuture', '#EcoFriendly',
    '#CarbonNeutral', '#CircularEconomy', '#CleanEnergy', '#SustainableFuture'
  ],
  trending: [
    '#Trending', '#Viral', '#CleanEnergyNow', '#GreenRevolution',
    '#SustainabilityMatters', '#ClimateEmergency', '#ActOnClimate', '#GreenInnovation'
  ],
  general: [
    '#PowerPlantEnergy', '#SustainableAviationFuel', '#Bioenergy',
    '#RenewableEnergy', '#CleanAviation', '#GreenEnergy'
  ]
};

/**
 * Select content category based on distribution weights
 */
function selectCategory(): keyof typeof CONTENT_CATEGORIES {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [category, config] of Object.entries(CONTENT_CATEGORIES)) {
    cumulative += config.weight;
    if (rand <= cumulative) {
      return category as keyof typeof CONTENT_CATEGORIES;
    }
  }
  
  return 'technology'; // fallback
}

/**
 * Generate hashtags for category
 */
function generateHashtags(category: keyof typeof CONTENT_CATEGORIES): string[] {
  const categoryHashtags = HASHTAG_SETS[category] || [];
  const generalHashtags = HASHTAG_SETS.general;
  
  // Mix category-specific and general hashtags
  const selected = [
    ...categoryHashtags.slice(0, 5),
    ...generalHashtags.slice(0, 3)
  ];
  
  // Shuffle and return
  return selected.sort(() => Math.random() - 0.5).slice(0, 10);
}

/**
 * Fetch copyright-free image from Unsplash
 */
async function fetchStockPhoto(query: string): Promise<string | null> {
  try {
    // Unsplash Source API (no API key needed for basic use)
    const searchQuery = encodeURIComponent(query);
    const url = `https://source.unsplash.com/1080x1080/?${searchQuery}`;
    
    const tempPath = path.join('/tmp', `stock_${Date.now()}.jpg`);
    
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, (redirectResponse) => {
              const fileStream = fs.createWriteStream(tempPath);
              redirectResponse.pipe(fileStream);
              
              fileStream.on('finish', () => {
                fileStream.close();
                resolve(tempPath);
              });
              
              fileStream.on('error', (error) => {
                fs.unlink(tempPath, () => {});
                reject(error);
              });
            }).on('error', reject);
          } else {
            reject(new Error('No redirect location'));
          }
        } else {
          const fileStream = fs.createWriteStream(tempPath);
          response.pipe(fileStream);
          
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(tempPath);
          });
          
          fileStream.on('error', (error) => {
            fs.unlink(tempPath, () => {});
            reject(error);
          });
        }
      }).on('error', reject);
    });
  } catch (error) {
    console.error('[Content] Failed to fetch stock photo:', error);
    return null;
  }
}

/**
 * Generate image prompt from content
 */
function generateImagePrompt(content: string, category: string): string {
  const keywords = content.toLowerCase();
  
  if (category === 'policy') {
    if (keywords.includes('arena') || keywords.includes('government')) {
      return 'Modern Australian government building with solar panels, clean energy infrastructure, professional photography, bright and optimistic';
    }
    return 'Policy makers and clean energy leaders in modern conference room, Australian flag, renewable energy charts, professional setting';
  } else if (category === 'technology') {
    if (keywords.includes('battery')) {
      return 'High-tech battery manufacturing facility, advanced materials, innovation lab, cutting-edge technology, bright and modern';
    } else if (keywords.includes('saf') || keywords.includes('aviation')) {
      return 'Modern sustainable aviation fuel refinery with aircraft, clean energy infrastructure, industrial photography, impressive scale';
    }
    return 'Futuristic clean technology laboratory, renewable energy equipment, scientists working, innovation and progress, bright lighting';
  } else if (category === 'environmental') {
    if (keywords.includes('bamboo')) {
      return 'Lush bamboo forest in Australia, sustainable agriculture, green landscape, natural beauty, environmental conservation';
    }
    return 'Beautiful Australian landscape with renewable energy infrastructure, wind turbines, solar farms, nature and technology harmony';
  }
  
  return 'Sustainable energy future, clean technology, modern infrastructure, bright and optimistic, professional photography';
}

/**
 * Generate diverse content for Instagram post
 */
export async function generateDiverseContent(): Promise<{
  content: string;
  hashtags: string[];
  imageUrl: string;
  category: string;
}> {
  // Select category
  const category = selectCategory();
  const categoryConfig = CONTENT_CATEGORIES[category];
  
  // Select random topic from category
  const topic = categoryConfig.topics[Math.floor(Math.random() * categoryConfig.topics.length)];
  
  console.log(`[Content] Generating ${category} content about: ${topic}`);
  
  // Generate caption using AI
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a content creator for PowerPlant Energy, an Australian company pioneering sustainable fuels, SAF, and bioenergy solutions. Write engaging, informative Instagram posts.'
      },
      {
        role: 'user',
        content: `Create an Instagram post about: ${topic}\n\nRequirements:\n- 2-3 short paragraphs (max 200 words)\n- Include 1-2 key facts or statistics\n- Professional yet accessible tone\n- End with a thought-provoking question or call-to-action\n- DO NOT include hashtags (they will be added separately)\n- Make it engaging and shareable\n\nFormat as plain text, no markdown.`
      }
    ]
  });
  
  const content = typeof response.choices[0].message.content === 'string' 
    ? response.choices[0].message.content 
    : JSON.stringify(response.choices[0].message.content);
  
  // Generate hashtags
  const hashtags = generateHashtags(category);
  
  // Decide: AI image or stock photo (50/50 split)
  const useAI = Math.random() < 0.5;
  let imageUrl: string;
  
  if (useAI) {
    console.log('[Content] Generating AI image');
    const imagePrompt = generateImagePrompt(content, category);
    const imageResult = await generateImage({ prompt: imagePrompt });
    imageUrl = imageResult.url || '';
  } else {
    console.log('[Content] Fetching stock photo');
    // Create search query based on category
    const searchQueries: Record<string, string> = {
      policy: 'renewable energy government australia',
      technology: 'clean technology innovation',
      environmental: 'sustainable nature environment',
      trending: 'renewable energy future'
    };
    
    const stockPhoto = await fetchStockPhoto(searchQueries[category] || 'renewable energy');
    imageUrl = stockPhoto || '';
    
    // Fallback to AI if stock photo fails
    if (!imageUrl) {
      console.log('[Content] Stock photo failed, using AI image');
      const imagePrompt = generateImagePrompt(content, category);
      const imageResult = await generateImage({ prompt: imagePrompt });
      imageUrl = imageResult.url || '';
    }
  }
  
  return {
    content,
    hashtags,
    imageUrl,
    category
  };
}
