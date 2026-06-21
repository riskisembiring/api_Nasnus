import { loadLocalEnv } from "./load-env.js";

loadLocalEnv();

const getRequiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Environment variable ${key} belum diatur`);
  }

  return value;
};

export const getImagekitPrivateKey = () => getRequiredEnv("IMAGEKIT_PRIVATE_KEY");

export const createImagekitAuthHeader = () => {
  const privateKey = getImagekitPrivateKey();

  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
};
