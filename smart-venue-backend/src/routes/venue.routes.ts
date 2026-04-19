import { Router } from 'express';
import { venueController } from '../controllers/venue.controller';

const router = Router();

router.get('/:venueId/zones', venueController.getAllZones);
router.get('/:venueId/zones/:zoneId/density', venueController.getDensity);
router.post('/:venueId/zones/:zoneId', venueController.updateOccupancy);
router.get('/:venueId/recommendations', venueController.getRecommendations);

export default router;
