import { createCanvas, loadImage } from '@napi-rs/canvas';

const TIERMAKER_DEFAULT_COLORS = {
  S: '#ff7f7f',
  A: '#ffbf7f',
  B: '#ffff7f',
  C: '#7fff7f',
  D: '#7fbfff',
  F: '#ff7fbf'
};

/**
 * Safely fetches an image buffer with User-Agent headers to prevent 403 Forbidden CDN blocks.
 * @param {string} url Image URL
 * @returns {Promise<Buffer|null>} Image buffer
 */
async function fetchImageBuffer(url) {
  if (!url || typeof url !== 'string') return null;

  // Data URLs (base64) can be passed directly
  if (url.startsWith('data:')) return url;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!res.ok) return null;
    
    // PREVENT SEGFAULTS: If the fetched URL returns HTML or text instead of an image, 
    // napi-rs/canvas will crash the entire Node process trying to parse it.
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
      console.warn(`[Renderer] URL did not return an image. Content-Type: ${contentType} for ${url}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`[Renderer] Failed to fetch image buffer for ${url}:`, err.message);
    return null;
  }
}

/**
 * Renders a high-resolution PNG image of the current Tier List state.
 * @param {Object} tierList Tier list data object with title, subtitle, tiers, items
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function renderTierListImage(tierList) {
  const width = 1920;
  const headerHeight = 180;
  const rowMinHeight = 180;
  const rowMargin = 8;

  const tiers = tierList.tiers || [];
  const totalRows = tiers.length;
  const height = headerHeight + (totalRows * (rowMinHeight + rowMargin)) + 40;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background - Dark Obsidian (#1a1a1a matching TierMaker dark mode)
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(tierList.title || 'Tier List', 48, 80);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '22px sans-serif';
  ctx.fillText(tierList.subtitle || 'Created on TierLive Engine', 48, 130);

  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(48, 160);
  ctx.lineTo(width - 48, 160);
  ctx.stroke();

  // Pre-load all item images asynchronously using fetchImageBuffer to bypass 403 blocks
  const loadedImagesMap = new Map();
  await Promise.all(
    tierList.items.map(async (item) => {
      const url = item.imageUrl || item.url;
      if (url) {
        try {
          const imgBuffer = await fetchImageBuffer(url);
          if (imgBuffer) {
            const img = await loadImage(imgBuffer);
            loadedImagesMap.set(item.id, img);
          }
        } catch (err) {
          console.warn(`Failed to render canvas image for item ${item.name}:`, err.message);
        }
      }
    })
  );

  let currentY = headerHeight + 10;
  const itemsList = tierList.items || [];

  for (const tierRow of tiers) {
    const itemsInTier = itemsList.filter(item => item.currentTier === tierRow.id);
    const rowColor = tierRow.color || TIERMAKER_DEFAULT_COLORS[tierRow.id] || '#7fff7f';

    const rowX = 48;
    const rowW = width - 96;
    const rowH = rowMinHeight;

    // Row Container Box
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(rowX, currentY, rowW, rowH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(rowX, currentY, rowW, rowH);

    // Tier Header Box (Left Side)
    const headerW = 180;
    ctx.fillStyle = rowColor;
    ctx.fillRect(rowX, currentY, headerW, rowH);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tierRow.name || tierRow.id, rowX + (headerW / 2), currentY + (rowH / 2));

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Render Items inside row
    let itemX = rowX + headerW + 8;
    const itemY = currentY + 6;
    const itemSize = rowH - 12;

    if (itemsInTier.length === 0) {
      ctx.fillStyle = '#444444';
      ctx.font = 'italic 20px sans-serif';
      ctx.fillText('No items in this tier', itemX + 16, currentY + (rowH / 2) + 6);
    } else {
      for (const item of itemsInTier) {
        if (itemX + itemSize > rowX + rowW - 6) break;

        const loadedImg = loadedImagesMap.get(item.id);

        if (loadedImg) {
          ctx.drawImage(loadedImg, itemX, itemY, itemSize, itemSize);
        } else {
          ctx.fillStyle = '#222222';
          ctx.fillRect(itemX, itemY, itemSize, itemSize);
          ctx.strokeStyle = '#444444';
          ctx.lineWidth = 2;
          ctx.strokeRect(itemX, itemY, itemSize, itemSize);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px sans-serif';
          const safeName = item.name || 'Unknown';
          const nameText = safeName.length > 12 ? safeName.substring(0, 10) + '..' : safeName;
          ctx.fillText(nameText, itemX + 10, itemY + (itemSize / 2) + 6);
        }

        itemX += itemSize + 8;
      }
    }

    currentY += rowH + rowMargin;
  }

  return canvas.toBuffer('image/png');
}
