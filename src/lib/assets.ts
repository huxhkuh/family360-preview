declare global{interface Window{__FAMILY360_ASSETS__?:Record<string,string>}}
/** The same source runs on the website and in the self-contained local preview. */
export function publicAsset(path:string){return (typeof window!=='undefined'&&window.__FAMILY360_ASSETS__?.[path])||`${import.meta.env.BASE_URL}${path}`;}
