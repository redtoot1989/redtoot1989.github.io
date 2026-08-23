import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore();

// جلب كل البروفايلات الموافقة فقط
async function loadApprovedProfiles() {
    const q = query(
        collection(db, "profiles"),
        where("status", "==", "approved")
    );

    const snap = await getDocs(q);

    let profiles = [];

    snap.forEach(doc => {
        profiles.push({
            id: doc.id,
            ...doc.data()
        });
    });

    console.log("Approved profiles:", profiles);
    return profiles;
}

loadApprovedProfiles();

