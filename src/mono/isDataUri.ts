export const dataURIPrefix = 'data:application/octet-stream;base64,';
export const isDataUri = (name: string) => name.indexOf(dataURIPrefix) === 0;
