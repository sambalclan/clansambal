/**
 * Analytics & Charts Module
 * Handles all MTD statistical aggregations and Chart.js rendering.
 */
import {  } from './constants.js';

let starsChart = null;      
let efficiencyChart = null; 

/**
 */
export function renderCharts(warHistory, range = 'month') {
    if (!warHistory || warHistory.length === 0) return;

    // Filter history based on range
    const filteredHistory = filterHistoryByRange(warHistory, range);
}


function renderTopPerformers(warHistory) {
    const container = document.getElementById('topPerformersContainer');
    if (!container) return;

    const topPerformers = Object.values(statsMap)
        .filter(p => (p.s3 + p.s2 + p.s1 + p.s0) > 0)
        .sort((a, b) => b.totalStars - a.totalStars || b.s3 - a.s3)
        .slice(0, 25);

    if (topPerformers.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-600 py-10 text-[10px]">No attack data for this range.</p>`;
        return;
    }
    container.innerHTML = html + `</body></table>`;
}