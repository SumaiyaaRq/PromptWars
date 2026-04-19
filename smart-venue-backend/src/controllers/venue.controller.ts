import { Request, Response, NextFunction } from 'express';
import { venueService } from '../services/venue.service';

export class VenueController {
  async getDensity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // const { venueId, zoneId } = req.params;
      const venueId = req.params.venueId as string;
      const zoneId = req.params.zoneId as string;

      const densityData = await venueService.getZoneDensity(venueId, zoneId);

      if (!densityData) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }

      res.status(200).json(densityData);
    } catch (error) {
      next(error); // Pass to global error handler
    }
  }

  async getAllZones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const venueId = req.params.venueId as string;

      const zonesData = await venueService.getAllZones(venueId);

      res.status(200).json(zonesData);
    } catch (error) {
      next(error); // Pass to global error handler
    }
  }

  async updateOccupancy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const venueId = req.params.venueId as string;
      const zoneId = req.params.zoneId as string;
      const { currentOccupancy } = req.body;

      if (typeof currentOccupancy !== 'number' || currentOccupancy < 0) {
        res.status(400).json({ error: 'Invalid input: currentOccupancy must be a number >= 0' });
        return;
      }

      const updated = await venueService.updateZoneOccupancy(venueId, zoneId, currentOccupancy);

      if (!updated) {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Zone updated successfully' });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  }
  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const venueId = req.params.venueId as string;
      const recommendations = await venueService.getRecommendations(venueId);
      res.status(200).json(recommendations);
    } catch (error) {
      next(error);
    }
  }
}

export const venueController = new VenueController();
