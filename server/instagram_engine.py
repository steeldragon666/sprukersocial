#!/usr/bin/env python3
"""
Instagram Automation Engine
Handles content generation, posting, and follower growth using Instagrapi
"""

import json
import os
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import requests
from instagrapi import Client
from instagrapi.exceptions import LoginRequired, ChallengeRequired
from cryptography.fernet import Fernet

# Content topics for PowerPlant Energy
CONTENT_TOPICS = [
    "Sustainable Aviation Fuel (SAF) breakthroughs and industry adoption",
    "Bioenergy policy updates in Australia and government initiatives",
    "Renewable energy technology innovations and electrification advances",
    "Low-carbon liquid fuels development and circular economy",
    "Bamboo biomass conversion to SAF and graphite technologies",
    "ARENA funding announcements for clean energy projects",
    "Australian government renewable energy targets and commitments",
    "Biofuel industry partnerships and commercial deployments",
    "Energy transition success stories in aviation sector",
    "Next-generation battery materials from sustainable sources"
]

# Hashtag sets by category
HASHTAG_SETS = {
    "SAF": [
        "#SustainableAviationFuel", "#SAF", "#CleanAviation", "#GreenAviation",
        "#AviationInnovation", "#SustainableFuture", "#EcoFriendly", "#NetZero"
    ],
    "Bioenergy": [
        "#biofuel", "#biodiesel", "#bioenergy", "#biomass", "#renewablefuels",
        "#circulareconomy", "#wastetonenergy", "#biorefinery"
    ],
    "Renewables": [
        "#renewableenergy", "#cleanenergy", "#greenenergy", "#sustainability",
        "#climateaction", "#energytransition", "#decarbonization", "#cleantech"
    ],
    "PowerPlant": [
        "#powerplant", "#powergeneration", "#energyinfrastructure", "#electricity",
        "#energyinnovation", "#greentechnology", "#sustainabletech"
    ],
    "Australian": [
        "#AustralianEnergy", "#AusRenewables", "#CleanEnergyAustralia",
        "#ARENA", "#AustraliaNetZero"
    ]
}


class InstagramAutomation:
    def __init__(self, username: str, password: str, session_data: Optional[str] = None):
        self.username = username
        self.password = password
        self.client = Client()
        self.client.delay_range = [2, 5]  # Random delay between actions
        
        # Load session if available
        if session_data:
            try:
                self.client.set_settings(json.loads(session_data))
                self.client.login(username, password)
            except Exception as e:
                print(f"Failed to load session, logging in fresh: {e}")
                self.login()
        else:
            self.login()
    
    def login(self):
        """Login to Instagram"""
        try:
            self.client.login(self.username, self.password)
            print(f"Successfully logged in as {self.username}")
        except ChallengeRequired as e:
            print(f"Challenge required: {e}")
            raise Exception("2FA or challenge required. Please complete manually.")
        except Exception as e:
            print(f"Login failed: {e}")
            raise
    
    def get_session_data(self) -> str:
        """Get encrypted session data for storage"""
        return json.dumps(self.client.get_settings())
    
    def generate_content(self, topic: str, api_key: str) -> Dict[str, str]:
        """Generate post content using Claude API"""
        try:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 500,
                    "messages": [{
                        "role": "user",
                        "content": f"""Create an engaging Instagram post about: {topic}

Focus on PowerPlant Energy's work in sustainable fuels, SAF, bioenergy, and renewable energy in Australia.

Requirements:
- Write 2-3 short paragraphs (max 200 words)
- Include 1-2 key facts or statistics
- Professional yet accessible tone
- End with a call-to-action or thought-provoking question
- DO NOT include hashtags in the caption (they will be added separately)

Format as plain text, no markdown."""
                    }]
                },
                timeout=30
            )
            
            if response.status_code == 200:
                content = response.json()["content"][0]["text"]
                return {
                    "caption": content.strip(),
                    "topic": topic
                }
            else:
                raise Exception(f"API error: {response.status_code}")
                
        except Exception as e:
            print(f"Content generation failed: {e}")
            # Fallback to simple template
            return {
                "caption": f"Exciting developments in {topic}! PowerPlant Energy is leading the way in sustainable energy solutions for Australia. 🌱 #Innovation #Sustainability",
                "topic": topic
            }
    
    def generate_image_prompt(self, topic: str, caption: str) -> str:
        """Generate image prompt based on content"""
        # Simple prompt generation - can be enhanced with AI
        prompts = {
            "SAF": "Modern sustainable aviation fuel facility with aircraft in background, clean energy concept, professional photography style",
            "Bioenergy": "Bamboo biomass processing plant, renewable energy infrastructure, industrial photography",
            "Renewables": "Solar panels and wind turbines in Australian landscape, clean energy future, bright and optimistic",
            "PowerPlant": "Modern power generation facility with green technology, sustainable infrastructure",
            "Technology": "High-tech laboratory with renewable energy research, innovation and science"
        }
        
        # Match topic to category
        for category, prompt in prompts.items():
            if category.lower() in topic.lower():
                return prompt
        
        return "Sustainable energy infrastructure in Australia, modern and professional photography"
    
    def select_hashtags(self, topic: str, count: int = 15) -> List[str]:
        """Select relevant hashtags for the post"""
        selected = []
        
        # Determine categories based on topic
        if "SAF" in topic or "aviation" in topic.lower():
            selected.extend(random.sample(HASHTAG_SETS["SAF"], min(5, len(HASHTAG_SETS["SAF"]))))
        if "bioenergy" in topic.lower() or "biomass" in topic.lower():
            selected.extend(random.sample(HASHTAG_SETS["Bioenergy"], min(4, len(HASHTAG_SETS["Bioenergy"]))))
        if "renewable" in topic.lower() or "clean energy" in topic.lower():
            selected.extend(random.sample(HASHTAG_SETS["Renewables"], min(4, len(HASHTAG_SETS["Renewables"]))))
        
        # Always add some Australian context
        selected.extend(random.sample(HASHTAG_SETS["Australian"], min(2, len(HASHTAG_SETS["Australian"]))))
        
        # Remove duplicates and limit to count
        selected = list(set(selected))[:count]
        
        return selected
    
    def post_image(self, image_path: str, caption: str, hashtags: List[str]) -> Optional[str]:
        """Post an image to Instagram"""
        try:
            # Combine caption with hashtags
            full_caption = f"{caption}\n\n{' '.join(hashtags)}"
            
            # Upload photo
            media = self.client.photo_upload(
                image_path,
                full_caption
            )
            
            print(f"Successfully posted: {media.pk}")
            return media.pk
            
        except Exception as e:
            print(f"Failed to post image: {e}")
            return None
    
    def follow_user(self, username: str) -> bool:
        """Follow a user by username"""
        try:
            user_id = self.client.user_id_from_username(username)
            self.client.user_follow(user_id)
            print(f"Followed: {username}")
            time.sleep(random.uniform(10, 15))  # Wait 10-15 seconds between follows
            return True
        except Exception as e:
            print(f"Failed to follow {username}: {e}")
            return False
    
    def search_users_by_hashtag(self, hashtag: str, limit: int = 20) -> List[str]:
        """Search for users posting about a hashtag"""
        try:
            # Remove # if present
            hashtag = hashtag.replace("#", "")
            
            # Get recent media for hashtag
            medias = self.client.hashtag_medias_recent(hashtag, amount=limit)
            
            # Extract unique usernames
            usernames = list(set([media.user.username for media in medias]))
            
            return usernames[:limit]
            
        except Exception as e:
            print(f"Failed to search hashtag {hashtag}: {e}")
            return []
    
    def get_trending_accounts(self) -> List[str]:
        """Get list of accounts to follow based on industry relevance"""
        # Predefined list of relevant accounts in SAF, bioenergy, renewables
        accounts = [
            "cleanenergycouncil",
            "arenagovau",
            "qantas",
            "boeing",
            "airbus",
            "iata",
            "bioenergy_australia",
            "renewableenergyworld",
            "greentechmedia",
            "cleantech",
            "sustainableaviation",
            "neste_corporation",
            "worldbioenergy"
        ]
        
        # Search hashtags for more accounts
        hashtags_to_search = ["SAF", "bioenergy", "renewableenergy", "cleantech"]
        
        for hashtag in hashtags_to_search:
            try:
                found_users = self.search_users_by_hashtag(hashtag, limit=10)
                accounts.extend(found_users)
            except:
                continue
        
        # Remove duplicates
        return list(set(accounts))
    
    def get_post_analytics(self, media_pk: str) -> Optional[Dict]:
        """Get analytics for a posted media"""
        try:
            media_info = self.client.media_info(media_pk)
            
            return {
                "likes": media_info.like_count,
                "comments": media_info.comment_count,
                "views": getattr(media_info, 'view_count', 0)
            }
        except Exception as e:
            print(f"Failed to get analytics: {e}")
            return None


def main():
    """Test function"""
    # This would be called from Node.js via child_process
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python instagram_engine.py <command> [args...]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "test":
        print("Instagram engine loaded successfully")
    elif command == "generate_content":
        topic = sys.argv[2] if len(sys.argv) > 2 else CONTENT_TOPICS[0]
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        
        engine = InstagramAutomation("test", "test")
        content = engine.generate_content(topic, api_key)
        print(json.dumps(content))


if __name__ == "__main__":
    main()
