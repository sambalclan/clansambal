#!/usr/bin/env python3
"""
Generate HTML dashboard dari CoC stats JSON/CSV
"""

import json
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

class DashboardGenerator:
    def __init__(self, json_file: str = 'data/coc_clan_stats.json'):
        self.json_file = json_file
        self.stats = None
        self.load_stats()
    
    def load_stats(self):
        """Load stats dari JSON file"""
        if not Path(self.json_file).exists():
            print(f"⚠ File not found: {self.json_file}")
            return
        
        with open(self.json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self.stats = data if isinstance(data, list) else [data]
    
    def get_latest(self) -> Dict[str, Any]:
        """Get latest stats"""
        return self.stats[-1] if self.stats else None
    
    def get_trending_data(self, key_path: str, limit: int = 24) -> List[tuple]:
        """Get trending data untuk chart (last N updates)"""
        if not self.stats:
            return []
        
        data = []
        for stat in self.stats[-limit:]:
            try:
                value = stat
                for key in key_path.split('.'):
                    value = value[key]
                timestamp = stat['timestamp']
                data.append((timestamp, value))
            except (KeyError, TypeError):
                pass
        
        return data
    
    def generate_html(self, output_file: str = 'docs/index.html') -> bool:
        """Generate HTML dashboard"""
        if not self.stats:
            print("⚠ No stats data available")
            return False
        
        latest = self.get_latest()
        clan = latest.get('clan', {})
        
        # Trophy trending data
        trophy_trend = self.get_trending_data('clan.level')
        member_count_trend = self.get_trending_data('clan.members')
        war_wins_trend = self.get_trending_data('clan.war_wins')
        
        html = f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoC Clan Stats - {clan.get('name', 'Unknown')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        header {{
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 15px;
            color: white;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }}
        
        h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .clan-tag {{
            font-family: monospace;
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 15px;
            border-radius: 5px;
            display: inline-block;
            margin-top: 10px;
        }}
        
        .last-update {{
            font-size: 0.9em;
            opacity: 0.9;
            margin-top: 15px;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
        }}
        
        .stat-label {{
            color: #666;
            font-size: 0.9em;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .stat-value {{
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }}
        
        .stat-subtitle {{
            color: #999;
            font-size: 0.85em;
            margin-top: 10px;
        }}
        
        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .chart-container {{
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }}
        
        .chart-title {{
            font-size: 1.3em;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }}
        
        .members-section {{
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }}
        
        .section-title {{
            font-size: 1.5em;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }}
        
        .members-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        
        .members-table thead {{
            background: #f5f5f5;
        }}
        
        .members-table th {{
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            border-bottom: 2px solid #ddd;
        }}
        
        .members-table td {{
            padding: 12px;
            border-bottom: 1px solid #eee;
        }}
        
        .member-rank {{
            display: inline-block;
            background: #667eea;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            text-align: center;
            line-height: 30px;
            font-weight: bold;
            font-size: 0.9em;
        }}
        
        .role-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .role-leader {{
            background: #ff6b6b;
            color: white;
        }}
        
        .role-coleader {{
            background: #ffa500;
            color: white;
        }}
        
        .role-member {{
            background: #e0e0e0;
            color: #666;
        }}
        
        footer {{
            text-align: center;
            color: white;
            margin-top: 40px;
            padding: 20px;
            opacity: 0.8;
        }}
        
        .legend {{
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 15px;
            font-size: 0.9em;
        }}
        
        @media (max-width: 768px) {{
            h1 {{
                font-size: 1.8em;
            }}
            
            .charts-grid {{
                grid-template-columns: 1fr;
            }}
            
            .stat-value {{
                font-size: 2em;
            }}
            
            .members-table {{
                font-size: 0.9em;
            }}
            
            .members-table th,
            .members-table td {{
                padding: 8px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚔️ {clan.get('name', 'Unknown Clan')}</h1>
            <span class="clan-tag">{clan.get('tag', 'N/A')}</span>
            <div class="last-update">
                Last updated: <strong>{latest.get('timestamp', 'N/A')}</strong>
            </div>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Clan Level</div>
                <div class="stat-value">{clan.get('level', 'N/A')}</div>
                <div class="stat-subtitle">Prestige & Bonuses</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Members</div>
                <div class="stat-value">{clan.get('members', 0)}/50</div>
                <div class="stat-subtitle">Current roster</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">War Wins</div>
                <div class="stat-value">{clan.get('war_wins', 0)}</div>
                <div class="stat-subtitle">Total victories</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-label">Win Streak</div>
                <div class="stat-value">{clan.get('win_streak', 0)}</div>
                <div class="stat-subtitle">Current streak</div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-container">
                <div class="chart-title">📊 Member Count Trend</div>
                <canvas id="memberChart"></canvas>
            </div>
            
            <div class="chart-container">
                <div class="chart-title">🏆 War Wins Trend</div>
                <canvas id="warChart"></canvas>
            </div>
        </div>
        
        <div class="members-section">
            <h2 class="section-title">👥 Top Members</h2>
            <table class="members-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Trophies</th>
                        <th>Town Hall</th>
                        <th>Exp Level</th>
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
"""
        
        # Add top members
        for idx, member in enumerate(latest.get('top_members', []), 1):
            role = member.get('role', 'member').lower()
            role_class = f'role-{role}' if role in ['leader', 'coleader', 'member'] else 'role-member'
            
            html += f"""                    <tr>
                        <td><span class="member-rank">{idx}</span></td>
                        <td><strong>{member.get('name', 'N/A')}</strong><br><code>{member.get('tag', 'N/A')}</code></td>
                        <td><strong>{member.get('trophies', 0)}</strong></td>
                        <td>{member.get('town_hall', 'N/A')}</td>
                        <td>{member.get('exp_level', 'N/A')}</td>
                        <td><span class="role-badge {role_class}">{member.get('role', 'member')}</span></td>
                    </tr>
"""
        
        html += """                </tbody>
            </table>
        </div>
        
        <footer>
            <p>Clash of Clans Stats Dashboard • Generated by GitHub Actions</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Data updates every hour</p>
        </footer>
    </div>
    
    <script>
        // Member Count Chart
        const memberCtx = document.getElementById('memberChart').getContext('2d');
        new Chart(memberCtx, {
            type: 'line',
            data: {
                labels: """ + str([t.split('T')[1][:5] for t, _ in member_count_trend[-24:]]).replace("'", '"') + """,
                datasets: [{
                    label: 'Members',
                    data: """ + str([v for _, v in member_count_trend[-24:]]) + """,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 50
                    }
                }
            }
        });
        
        // War Wins Chart
        const warCtx = document.getElementById('warChart').getContext('2d');
        new Chart(warCtx, {
            type: 'line',
            data: {
                labels: """ + str([t.split('T')[1][:5] for t, _ in war_wins_trend[-24:]]).replace("'", '"') + """,
                datasets: [{
                    label: 'War Wins',
                    data: """ + str([v for _, v in war_wins_trend[-24:]]) + """,
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>
"""
        
        # Create docs directory
        Path('docs').mkdir(exist_ok=True)
        
        # Write HTML file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"✓ Dashboard generated: {output_file}")
        return True


def main():
    generator = DashboardGenerator()
    generator.generate_html()


if __name__ == '__main__':
    main()
