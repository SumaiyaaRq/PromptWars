import { db } from '../config/firebase';

export class VenueService {
  private previousOccupancies = new Map<string, number>();

  async getZoneDensity(venueId: string, zoneId: string) {
    const zoneRef = db.collection('venues').doc(venueId).collection('zones').doc(zoneId);
    const zoneSnap = await zoneRef.get();

    if (!zoneSnap.exists) {
      return null;
    }

    const data = zoneSnap.data();
    if (!data) return null;

    const currentOccupancy = data.currentOccupancy || 0;
    const maxCapacity = data.maxCapacity || 1; // Prevent division by zero

    const densityPercentage = (currentOccupancy / maxCapacity) * 100;

    return {
      zoneId,
      currentOccupancy,
      maxCapacity,
      densityPercentage: Number(densityPercentage.toFixed(2))
    };
  }

  async getAllZones(venueId: string, skipTrendUpdate: boolean = false) {
    const zonesRef = db.collection('venues').doc(venueId).collection('zones');
    const zonesSnap = await zonesRef.get();

    if (zonesSnap.empty) {
      return [];
    }

    const zonesData = zonesSnap.docs.map(doc => {
      const data = doc.data();
      const currentOccupancy = data.currentOccupancy || 0;
      const maxCapacity = data.maxCapacity || 1; // Prevent division by zero
      const densityPercentage = (currentOccupancy / maxCapacity) * 100;

      const prevOccupancy = this.previousOccupancies.get(doc.id);
      let predictedStatus = 'Stable';

      if (prevOccupancy !== undefined) {
        if (currentOccupancy > prevOccupancy) {
          predictedStatus = 'Increasing';
        } else if (currentOccupancy < prevOccupancy) {
          predictedStatus = 'Decreasing';
        }
      }

      if (!skipTrendUpdate) {
        this.previousOccupancies.set(doc.id, currentOccupancy);
      }

      let waitTime = '1-3 min';
      if (densityPercentage > 80) waitTime = '8-15+ min';
      else if (densityPercentage >= 50) waitTime = '3-8 min';

      return {
        zoneId: doc.id,
        currentOccupancy,
        maxCapacity,
        densityPercentage: Number(densityPercentage.toFixed(2)),
        predictedStatus,
        waitTime
      };
    });

    return zonesData;
  }

  async updateZoneOccupancy(venueId: string, zoneId: string, currentOccupancy: number): Promise<boolean> {
    const zoneRef = db.collection('venues').doc(venueId).collection('zones').doc(zoneId);
    const zoneSnap = await zoneRef.get();

    if (!zoneSnap.exists) {
      return false;
    }

    const data = zoneSnap.data();
    let finalOccupancy = currentOccupancy;
    if (data && data.maxCapacity) {
      finalOccupancy = Math.min(Math.max(0, currentOccupancy), data.maxCapacity);
    } else {
      finalOccupancy = Math.max(0, currentOccupancy);
    }

    await zoneRef.update({ currentOccupancy: finalOccupancy });
    return true;
  }
  async getRecommendations(venueId: string) {
    const zones = await this.getAllZones(venueId, true);
    
    if (zones.length === 0) {
      return { recommendedZones: [], crowdedZones: [], summary: "No zones found for this venue." };
    }

    const recommendedZones: string[] = [];
    const crowdedZones: string[] = [];
    const neutralZones: string[] = [];

    zones.forEach(zone => {
      if (zone.densityPercentage < 50) {
        recommendedZones.push(zone.zoneId);
      } else if (zone.densityPercentage > 80) {
        crowdedZones.push(zone.zoneId);
      } else {
        neutralZones.push(zone.zoneId);
      }
    });

    let summary = '';
    
    const formatList = (list: string[]) => {
      if (list.length === 0) return '';
      if (list.length === 1) return list[0];
      if (list.length === 2) return `${list[0]} and ${list[1]}`;
      return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
    };

    if (recommendedZones.length > 0 && crowdedZones.length > 0) {
      summary = `Move from ${formatList(crowdedZones)} ➔ ${formatList(recommendedZones)} (less crowded path).`;
    } else if (recommendedZones.length > 0) {
      summary = `${formatList(recommendedZones)} ${recommendedZones.length > 1 ? 'are' : 'is'} currently recommended with low crowd density.`;
    } else if (crowdedZones.length > 0) {
      if (neutralZones.length > 0) {
        summary = `All recommended zones are busy. Move from ${formatList(crowdedZones)} ➔ ${formatList(neutralZones)}.`;
      } else {
        const sortedCrowded = [...zones].sort((a, b) => a.densityPercentage - b.densityPercentage);
        const leastCrowded = sortedCrowded[0].zoneId;
        summary = `All zones are crowded. ${leastCrowded} is the least crowded option.`;
      }
    } else {
      summary = `Crowd levels are moderate across the venue.`;
    }

    return {
      recommendedZones,
      crowdedZones,
      summary
    };
  }
}

export const venueService = new VenueService();
