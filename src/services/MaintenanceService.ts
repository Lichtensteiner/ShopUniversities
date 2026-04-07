import { collection, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MAINTENANCE_DOC_ID = 'system_resets';

export const runMaintenance = async (userRole: string) => {
  if (userRole !== 'admin') return;

  try {
    const maintenanceRef = doc(db, 'system_config', MAINTENANCE_DOC_ID);
    const maintenanceSnap = await getDoc(maintenanceRef);
    
    const now = new Date();
    const nowTime = now.getTime();

    if (!maintenanceSnap.exists()) {
      // Initialize if not exists
      await setDoc(maintenanceRef, {
        last_connections_reset: nowTime,
        last_reports_reset: nowTime,
        last_houses_reset: nowTime
      });
      return;
    }

    const data = maintenanceSnap.data();
    const lastConnectionsReset = data.last_connections_reset || 0;
    const lastReportsReset = data.last_reports_reset || 0;
    const lastHousesReset = data.last_houses_reset || 0;

    const ONE_DAY = 24 * 60 * 60 * 1000;
    const FIVE_DAYS = 5 * ONE_DAY;

    // 1. Reset Connections (24h)
    if (nowTime - lastConnectionsReset >= ONE_DAY) {
      console.log("Maintenance: Resetting connections history (24h)...");
      const connectionsSnap = await getDocs(collection(db, 'connections'));
      const deletePromises = connectionsSnap.docs.map(d => deleteDoc(doc(db, 'connections', d.id)));
      await Promise.all(deletePromises);
      await updateDoc(maintenanceRef, { last_connections_reset: nowTime });
    }

    // 2. Reset Reports Archive (24h)
    if (nowTime - lastReportsReset >= ONE_DAY) {
      console.log("Maintenance: Resetting reports archive (24h)...");
      const reportsSnap = await getDocs(collection(db, 'reports'));
      const deletePromises = reportsSnap.docs.map(d => deleteDoc(doc(db, 'reports', d.id)));
      await Promise.all(deletePromises);
      await updateDoc(maintenanceRef, { last_reports_reset: nowTime });
    }

    // 3. Reset Houses System (5 days)
    if (nowTime - lastHousesReset >= FIVE_DAYS) {
      console.log("Maintenance: Resetting houses points (5 days)...");
      
      // Reset house totals
      const housesSnap = await getDocs(collection(db, 'houses'));
      const resetHousePromises = housesSnap.docs.map(d => updateDoc(doc(db, 'houses', d.id), { total_points: 0 }));
      await Promise.all(resetHousePromises);

      // Clear history
      const historySnap = await getDocs(collection(db, 'house_points_history'));
      const deleteHistoryPromises = historySnap.docs.map(d => deleteDoc(doc(db, 'house_points_history', d.id)));
      await Promise.all(deleteHistoryPromises);

      await updateDoc(maintenanceRef, { last_houses_reset: nowTime });
    }

  } catch (error) {
    console.error("Maintenance Error:", error);
  }
};
