import z from "zod";

export const descriptionSchema = z
    .string()
    .min(1, "Description can't be empty.")
    .max(100, "Descriptions cannot exceed 100 characters.")
    .optional();
export const nameSchema = z.string().min(1, "Names cannot be empty.").max(32, "Names cannot exceed 32 characters.");
