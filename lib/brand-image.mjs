// Ondam does not render the original CLover calligraphy asset.
export function brandImage(_file,language) {
 const label=language==='en'?'Ondam':'온담';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120"><text x="200" y="85" text-anchor="middle" font-family="sans-serif" font-size="72" font-weight="700" fill="#42664b">'+label+'</text></svg>';
}
