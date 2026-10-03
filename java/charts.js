/**
 * Analytics & Charts Module
 * Handles all MTD statistical aggregations and Chart.js rendering.
 */
import { parseCoCDate } from './constants.js';

let starsChart = null;      
let efficiencyChart = null; 

/**
 */
export function renderCharts(warHistory, range = 'month') {
    if (!warHistory || warHistory.length === 0) return;

    // Filter history based on range
    const filteredHistory = filterHistoryByRange(warHistory, range);
    
    renderStarsTrend(filteredHistory);
    renderTopPerformers(filteredHistory);
    renderEfficiencyChart(filteredHistory);
}


function renderTopPerformers(warHistory) {
    const container = document.getElementById('topPerformersContainer');
    if (!container) return;
    
    const statsMap = {}; 
    warHistory.forEach(war => {
        if (!war.clan || !war.clan.members) return;
        war.clan.members.forEach(m => {
            if (!statsMap[m.tag]) statsMap[m.tag] = { name: m.name, s3: 0, s2: 0, s1: 0, s0: 0, totalStars: 0 };
            (m.attacks || []).forEach(atk => {
                statsMap[m.tag].totalStars += atk.stars;
                if (atk.stars === 3) statsMap[m.tag].s3++;
                else if (atk.stars === 2) statsMap[m.tag].s2++;
                else if (atk.stars === 1) statsMap[m.tag].s1++;
                else statsMap[m.tag].s0++;
            });
        });
    });

    const topPerformers = Object.values(statsMap)
        .filter(p => (p.s3 + p.s2 + p.s1 + p.s0) > 0)
        .sort((a, b) => b.totalStars - a.totalStars || b.s3 - a.s3)
        .slice(0, 25);

    if (topPerformers.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-600 py-10 text-[10px]">No attack data for this range.</p>`;
        return;
    }

    let html = `<table class="w-full text-[10px] text-left border-collapse"><thead><tr class="border-b border-gray-800 text-gray-500 uppercase font-black"><th class="py-2 pl-1">Player</th><th class="py-2 text-center text-green-500">3★</th><th class="py-2 text-center text-yellow-500">2★</th><th class="py-2 text-center text-red-500">1★</th><th class="py-2 text-center text-gray-500">0★</th><th class="py-2 text-right pr-1 gold">Total</th></tr></thead><tbody class="divide-y divide-gray-800/30">`;
    topPerformers.forEach(p => {
        html += `<tr class="hover:bg-white/5 transition-colors"><td class="py-2 pl-1 font-bold text-gray-300">${p.name}</td><td class="py-2 text-center font-mono">${p.s3}</td><td class="py-2 text-center font-mono">${p.s2}</td><td class="py-2 text-center font-mono">${p.s1}</td><td class="py-2 text-center font-mono">${p.s0}</td><td class="py-2 text-right pr-1 font-bold gold">${p.totalStars}</td></tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

function renderEfficiencyChart(warHistory) {
    const canvas = document.getElementById('efficiencyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const statsMap = {}; 

    warHistory.forEach(war => {
        if (!war.clan || !war.clan.members) return;
        war.clan.members.forEach(m => {
            if (!statsMap[m.tag]) statsMap[m.tag] = { name: m.name, s3: 0, s2: 0, s1: 0, s0: 0, total: 0 };
            (m.attacks || []).forEach(atk => {
                statsMap[m.tag].total++;
                if (atk.stars === 3) statsMap[m.tag].s3++;
                else if (atk.stars === 2) statsMap[m.tag].s2++;
                else if (atk.stars === 1) statsMap[m.tag].s1++;
                else statsMap[m.tag].s0++;
            });
        });
    });

    if (efficiencyChart) efficiencyChart.destroy();
    efficiencyChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, beginAtZero: true, max: 100, grid: { color: '#333' }, ticks: { color: '#777', font: { size: 9 }, callback: (v) => v + '%' } },
                y: { stacked: true, grid: { display: false }, ticks: { color: '#ccc', font: { size: 10, weight: 'bold' } } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#777', font: { size: 9 }, boxWidth: 10, padding: 15 } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` } }
            }
        }
    });
    const container = document.getElementById('efficiencyContainer');
    if (container) container.style.height = `${top25.length * 28 + 60}px`;
}
