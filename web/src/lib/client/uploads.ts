"use client";

export type UploadTicket = { idx: number; path: string; token: string; signedUrl: string };

const tickets = new Map<string, UploadTicket[]>();

export const rememberUploads = (walkId: string, list: UploadTicket[]) => tickets.set(walkId, list);
export const recallUploads = (walkId: string) => tickets.get(walkId) ?? null;
