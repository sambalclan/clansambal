/**
 * Rendering Module
 * Responsible for generating all dynamic HTML content for the dashboard.
 */
import { role, getTHImage } from './constants.js';

/**
 * Renders the member roster list with league icons and donation stats.
 */
export function renderMembers(list) {
    const container = document.getElementById('memberList');
    if (!container) return;
    if (list.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-600 py-10 italic">No members found.</p>`;
        return;
    }
    container.innerHTML = list.map(m => {
        const leagueIcon = m.leagueTier?.iconUrls?.small || m.league?.iconUrls?.small || '';
        return `
        <div class="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-[#252525] border border-transparent rounded-lg">
            <img src="${getTHImage(m.townHallLevel)}" class="th-icon">
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1 md:gap-2 truncate">
                    <span class="font-bold text-[11px] md:text-xs text-white">${m.name}</span>
                    <span class="text-[7px] md:text-[8px] text-gray-500 font-mono">XP ${m.expLevel}</span>
                </div>
                <span class="text-[7px] md:text-[8px] gold font-bold uppercase block">${role[m.role]}</span>
                <div class="flex gap-3 md:gap-4 mt-1 md:mt-1.5">
                    <div><p class="stat-label">Donated</p><p class="stat-value text-green-500 text-[8px] md:text-[9px]">${m.donations}</p></div>
                    <div><p class="stat-label">Received</p><p class="stat-value text-red-400 text-[8px] md:text-[9px]">${m.donationsReceived}</p></div>
                </div>
            </div>
            <div class="flex flex-col items-center justify-center min-w-[50px] md:min-w-[60px]">
                ${leagueIcon ? `<img src="${leagueIcon}" class="w-5 h-5 md:w-6 md:h-6 object-contain mb-1" title="${m.leagueTier?.name || m.league?.name || 'Unranked'}">` : ''}
                <p class="text-[11px] md:text-xs font-bold text-[#d4af37]">${m.trophies.toLocaleString()}</p>
                <p class="text-[7px] md:text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Trophies</p>
            </div>
        </div>`;
    }).join('');
}

/**
 * Returns a simple string label for TH differentials.
 */
function getDifficultyLabel(targetTH, actorTH) {
    if (targetTH === "?" || actorTH === "?") return "Unknown";
    const diff = targetTH - actorTH;
    if (diff > 0) return "Hard";
    if (diff === 0) return "Normal";
    return "Easy";
}

//Tampilan depan Dashboard {02}
export function renderAbout(clanData) {
    const container = document.getElementById('aboutContent'); if (!container || !clanData) return;
    const labelsHtml = (clanData.labels || []).map(l => `<div class="flex items-center gap-1.5 bg-[#252525] px-2 py-1 rounded border border-gray-800"><img src="${l.iconUrls.small}" class="w-3.5 h-3.5"><span class="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase">${l.name}</span></div>`).join('');
    container.innerHTML = `<div class="panel p-4 md:p-6 space-y-6 md:space-y-8">
        <div class="bg-[#1a1a1a] p-4 md:p-6 rounded-xl border border-gray-800">
            <div class="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                <div class="flex-1 space-y-4 w-full">
                    <div class="flex items-center gap-4">
                        <img src="${clanData.badgeUrls.medium}" class="w-16 h-16 md:w-20 md:h-20">
                        <div>
                            <h2 class="medieval text-xl md:text-2xl font-bold gold">${clanData.name}</h2>
                            <div class="flex items-center gap-2 mt-1"><span class="text-[10px] md:text-xs font-mono text-gray-500">${clanData.tag}</span></div>
                        </div>
                    </div>
                    <p class="text-[11px] md:text-sm text-gray-300 leading-relaxed italic">${clanData.description}</p>
                </div>
                <div class="grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-4 w-full md:w-auto md:min-w-[350px]">
                    <div><p class="stat-label">Location</p><p class="stat-value text-[11px] md:text-xs">${clanData.location?.name || 'Unknown'}</p></div>
                    <div><p class="stat-label">Language</p><p class="stat-value text-[11px] md:text-xs">${clanData.chatLanguage?.name || 'English'}</p></div>
                    <div><p class="stat-label">Clan Level</p><p class="stat-value text-gold text-[11px] md:text-xs">${clanData.clanLevel}</p></div>
                    <div><p class="stat-label">Family Friendly</p><p class="stat-value text-[11px] md:text-xs">${clanData.isFamilyFriendly ? 'Yes' : 'No'}</p></div>
                    <div class="col-span-2"><p class="stat-label mb-2">Clan Labels</p><div class="flex flex-wrap gap-2">${labelsHtml}</div></div>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-[#1a1a1a] p-4 md:p-5 rounded-xl border border-gray-800 flex flex-col justify-between min-h-[250px] md:min-h-[300px]">
                <div class="flex-1 flex flex-col">
                    <h3 class="medieval text-xs md:text-sm font-bold gold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    War calculation
                    </h3>
                    <div class="space-y-3 md:space-y-4 flex-1">
                        <div class="p-3 bg-[#252525] rounded-lg h-[58px] flex flex-col justify-center"><p class="stat-label">Clan War League Log</p><p class="stat-value text-white text-[11px] md:text-xs">${clanData.warLeague?.name || 'Unranked'}</p></div>
</div 
    </div>`;
}