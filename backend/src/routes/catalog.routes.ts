import { Router } from 'express';
import {
  deletePrice,
  deleteAddon,
  deleteWasher,
  getAddons,
  getBusinessCurrent,
  getPrices,
  getWasherByToken,
  getWashers,
  postAddon,
  postBusiness,
  postPrice,
  postWasher,
} from '../controllers/catalog.controller';

const router = Router();

router.get('/business/current', getBusinessCurrent);
router.post('/business', postBusiness);
router.get('/washers/by-token/:qrToken', getWasherByToken);
router.get('/washers', getWashers);
router.post('/washers', postWasher);
router.delete('/washers/:id', deleteWasher);
router.get('/prices', getPrices);
router.post('/prices', postPrice);
router.delete('/prices/:id', deletePrice);
router.get('/addons', getAddons);
router.post('/addons', postAddon);
router.delete('/addons/:id', deleteAddon);

export default router;
