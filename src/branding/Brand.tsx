export const brandAsset=(mode:'light'|'dark'|'mono'='light',mark=false)=>`${import.meta.env.BASE_URL}brand/concept-5-${mode}${mark?'-mark':''}.svg`;
export function BrandLogo({mode='light',mark=false,className=''}:{mode?:'light'|'dark'|'mono';mark?:boolean;className?:string}){
 return <img className={`mesudarim-logo${mark?' brand-mark':' brand-stacked'} ${className}`} src={brandAsset(mode,mark)} alt={mark?'מסודרים 360°':'מסודרים 360° — עושים לך סדר בכסף.'} width={mark?64:320} height={mark?64:242}/>;
}
