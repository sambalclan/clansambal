#!/usr/bin/env python3
"""
Clash of Clans Clan Stats Fetcher
Fetch clan statistics dari Supercell API dan update JSON/CSV files
"""

import os
import json
import csv
from datetime import datetime
import requests
from typing import Dict, Any, List
import sys

class CoCStatsFetcher:
    def __init__(self, api_token: str, clan_tag: str):
        """
        Initialize fetcher dengan API token dan clan tag
        
        Args:
            api_token: Supercell API Bearer token
            clan_tag: Clan tag (format: #XXXXX)
        """
        self.api_token = api_token
        self.clan_tag = clan_tag if clan_tag.startswith('#') else f'#{clan_tag}'
        self.base_url = "https://api.clashofclans.com/v1"
        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Accept': 'application/json'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def fetch_clan_info(self) -> Dict[str, Any]:
        """Fetch informasi clan dari API"""
        try:
            # URL encode clan tag
            encoded_tag = self.clan_tag.replace('#', '%23')
            url = f"{self.base_url}/clans/{encoded_tag}"
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching clan info: {e}", file=sys.stderr)
            raise

    def fetch_clan_members(self) -> List[Dict[str, Any]]:
        """Fetch member list dari clan"""
        try:
            encoded_tag = self.clan_tag.replace('#', '%23')
            url = f"{self.base_url}/clans/{encoded_tag}/members"
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return data.get('items', [])
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching clan members: {e}", file=sys.stderr)
            raise

    def prepare_clan_stats(self, clan_info: Dict, members: List[Dict]) -> Dict[str, Any]:
        """Prepare clan statistics untuk disimpan"""
        timestamp = datetime.now().isoformat()
        
        return {
            'timestamp': timestamp,
            'clan': {
                'name': clan_info.get('name'),
                'tag': clan_info.get('tag'),
                'level': clan_info.get('clanLevel'),
                'members': clan_info.get('members'),
                'war_wins': clan_info.get('warWins'),
                'war_frequency': clan_info.get('warFrequency'),
                'win_streak': clan_info.get('warWinStreak'),
                'type': clan_info.get('type'),
                'description': clan_info.get('description')
            },
            'members_count': len(members),
            'top_members': self._get_top_members(members, limit=10),
            'all_members': self._format_members(members)
        }

    def _get_top_members(self, members: List[Dict], limit: int = 10) -> List[Dict]:
        """Get top members by trophies"""
        sorted_members = sorted(
            members,
            key=lambda x: x.get('trophies', 0),
            reverse=True
        )
        return [self._format_member_short(m) for m in sorted_members[:limit]]

    def _format_members(self, members: List[Dict]) -> List[Dict]:
        """Format all members data"""
        return [self._format_member_full(m) for m in members]

    def _format_member_short(self, member: Dict) -> Dict:
        """Format short member info"""
        return {
            'name': member.get('name'),
            'tag': member.get('tag'),
            'trophies': member.get('trophies'),
            'exp_level': member.get('expLevel'),
            'role': member.get('role')
        }

    def _format_member_full(self, member: Dict) -> Dict:
        """Format full member info"""
        return {
            'name': member.get('name'),
            'tag': member.get('tag'),
            'trophies': member.get('trophies'),
            'exp_level': member.get('expLevel'),
            'role': member.get('role'),
            'joined': member.get('joinedDate'),
            'town_hall': member.get('townHallLevel'),
            'builder_hall': member.get('builderHallLevel')
        }

    def save_to_json(self, data: Dict, filepath: str = 'coc_clan_stats.json'):
        """Simpan data ke JSON file"""
        try:
            # Jika file sudah ada, append ke history
            history = []
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
                    if isinstance(existing, list):
                        history = existing
                    else:
                        history = [existing]
            
            history.append(data)
            
            # Keep only last 168 records (1 week with hourly updates)
            if len(history) > 168:
                history = history[-168:]
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(history, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Data saved to {filepath}")
            return True
        except Exception as e:
            print(f"❌ Error saving JSON: {e}", file=sys.stderr)
            raise

    def save_to_csv(self, data: Dict, filepath: str = 'coc_clan_stats.csv'):
        """Simpan member stats ke CSV file"""
        try:
            members = data.get('all_members', [])
            
            if not members:
                print("⚠ No members to save")
                return False
            
            fieldnames = ['timestamp', 'name', 'tag', 'trophies', 'exp_level', 
                         'role', 'town_hall', 'builder_hall', 'joined']
            
            file_exists = os.path.exists(filepath)
            
            with open(filepath, 'a', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                
                # Write header jika file baru
                if not file_exists:
                    writer.writeheader()
                
                # Write data members
                for member in members:
                    row = {
                        'timestamp': data['timestamp'],
                        'name': member.get('name'),
                        'tag': member.get('tag'),
                        'trophies': member.get('trophies'),
                        'exp_level': member.get('exp_level'),
                        'role': member.get('role'),
                        'town_hall': member.get('town_hall'),
                        'builder_hall': member.get('builder_hall'),
                        'joined': member.get('joined')
                    }
                    writer.writerow(row)
            
            print(f"✓ CSV updated: {filepath}")
            return True
        except Exception as e:
            print(f"❌ Error saving CSV: {e}", file=sys.stderr)
            raise

    def run(self, output_json: str = 'coc_clan_stats.json', 
            output_csv: str = 'coc_clan_stats.csv') -> bool:
        """Main function - fetch dan save data"""
        print(f"🔄 Fetching Clash of Clans stats for {self.clan_tag}...")
        
        try:
            # Fetch data
            clan_info = self.fetch_clan_info()
            members = self.fetch_clan_members()
            
            # Prepare stats
            stats = self.prepare_clan_stats(clan_info, members)
            
            # Save files
            self.save_to_json(stats, output_json)
            self.save_to_csv(stats, output_csv)
            
            print(f"✓ Successfully updated stats!")
            print(f"  Clan: {stats['clan']['name']} ({stats['clan']['tag']})")
            print(f"  Members: {stats['members_count']}")
            
            return True
        except Exception as e:
            print(f"❌ Failed to fetch and save stats: {e}", file=sys.stderr)
            return False


def main():
    # Get environment variables
    api_token = os.getenv('COC_API_TOKEN')
    clan_tag = os.getenv('COC_CLAN_TAG')
    output_json = os.getenv('OUTPUT_JSON', 'coc_clan_stats.json')
    output_csv = os.getenv('OUTPUT_CSV', 'coc_clan_stats.csv')
    
    # Validate inputs
    if not api_token:
        print("❌ Error: COC_API_TOKEN environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    if not clan_tag:
        print("❌ Error: COC_CLAN_TAG environment variable not set", file=sys.stderr)
        sys.exit(1)
    
    # Run fetcher
    fetcher = CoCStatsFetcher(api_token, clan_tag)
    success = fetcher.run(output_json, output_csv)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
