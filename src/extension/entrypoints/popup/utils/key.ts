export const copyKey = (key: { id: string; value: string; url?: string }) => {
  navigator.clipboard.writeText(`${key.id}:${key.value}`);
};
