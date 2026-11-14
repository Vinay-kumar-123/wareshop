import shopVisual from './shop.jpg';
import officeVisual from './office.jpg';
import warehouseVisual from './warehouse.jpg';
import godownVisual from './godown.jpg';
import heroCommercialVisual from './hero-commercial.jpg';

export const CATEGORY_VISUALS = {
  shop: shopVisual,
  shops: shopVisual,
  office: officeVisual,
  offices: officeVisual,
  warehouse: warehouseVisual,
  warehouses: warehouseVisual,
  godown: godownVisual,
  godowns: godownVisual,
  hero: heroCommercialVisual,
};

export function getCategoryVisual(categorySlugOrName) {
  const key = String(categorySlugOrName || '')
    .toLowerCase()
    .trim();
  if (key.includes('shop') || key.includes('retail') || key.includes('showroom')) {
    return shopVisual;
  }
  if (key.includes('office') || key.includes('cowork') || key.includes('corporate')) {
    return officeVisual;
  }
  if (key.includes('warehouse') || key.includes('logistics') || key.includes('distribution')) {
    return warehouseVisual;
  }
  if (key.includes('godown') || key.includes('storage') || key.includes('depot')) {
    return godownVisual;
  }
  return heroCommercialVisual;
}

export {
  shopVisual,
  officeVisual,
  warehouseVisual,
  godownVisual,
  heroCommercialVisual,
  heroCommercialVisual as heroCommercialImg,
};
