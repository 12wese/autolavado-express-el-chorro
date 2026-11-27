import { z } from 'zod';
import type { RequestHandler } from 'express';
import { recognizePlate } from '../services/vision.service';

const bodySchema = z.object({
  imageBase64: z.string().min(1),
});

export const recognizePlateFromImage: RequestHandler = async (req, res) => {
  const { imageBase64 } = bodySchema.parse(req.body);
  res.json(await recognizePlate(imageBase64));
};
