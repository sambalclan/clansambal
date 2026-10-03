async function fetchData(subPath) {
    
    const res = await fetch(`data/${subPath}?t=${Date.now()}`);

//pengambilan data/.
     if (!res.ok) throw new Error(`ERROR: ${subPath}`);
    return await res.json();
}
const fetchIndex = (type) => fetchData(`${type}_stats_index.json`);
const fetchDetail = (type, filename) => fetchData(`${type}_stats/${filename}`);

export async function fetchClanData() {
    const index = await fetchIndex('clan'); 
    for (const filename of index || []) {
        try {
            return await fetchDetail('clan', filename);
        } catch {
            console.warn(`_____ ${filename}akh`);
        }

    }
    throw new Error("______");
}
export const fetchMembersIndex = () => fetchIndex('clan');