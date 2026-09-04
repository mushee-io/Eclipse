export const LIVE_PROOF = {
  drawId: 1,
  participants: 3,
  capacity: "1,073,741,824",
  transactions: [
    ["B confidential deposit", "0x2787978b973ab1005a0003b8351d00c381062710f8c5656f4b770154e9861542", 11633858],
    ["C confidential deposit", "0xb1f562a6aee3a07996acca45967b3f8d64e1feab53a937f29636b0afaa86e27a", 11633863],
    ["Yield contribution", "0x56d805ecd10bf2c820f5e76745125168a0186fb32c6b13c07b51f5b8d0393a21", 11633869],
    ["Start draw", "0xca2a6197cb220d272475742cbed1d04a92d280218d1605efbfd74b49b198e46e", 11633870],
    ["Begin processing", "0xa50367847b1a75fa556991ce9ada0ad2e777cf4048ab2c109bd7ef8a2562e9ea", 11633871],
    ["Encrypted batch", "0xc01220efe3b2f8eb95e99e872949f6841096e66b033136d69963fb4b42e31647", 11633872],
    ["Finalize draw", "0x9472f38a61caceca4ee29544b8ce29d6f9463adc088bb076b3bd85e61c5b1d28", 11633873],
    ["Principal withdrawal", "0x754a8fe6a18ae08df00a13ddf2556b739ef19b717c4c14c0c140dec2215f2fa1", 11633883],
  ] as const,
} as const;
