"use client";

/**
 * The original video stays on the device; only a small re-encode is uploaded.
 * Keep the File in memory across client-side navigation so the walk page can
 * finish conversion and cut full-resolution close-ups.
 */
const files = new Map<string, File>();

export const rememberFile = (walkId: string, file: File) => files.set(walkId, file);
export const recallFile = (walkId: string) => files.get(walkId) ?? null;
