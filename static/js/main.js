document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const mainImage = document.getElementById('mainImage');
    const metadataContainer = document.getElementById('metadata');
    const filterGrid = document.getElementById('filterGrid');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Drag and drop handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processImage(files[0]);
        }
    });
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processImage(e.target.files[0]);
        }
    });
    
    function processImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        loadingSpinner.classList.remove('d-none');
        filterGrid.innerHTML = '';
        metadataContainer.innerHTML = '';
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display metadata
            const metadata = data.metadata;
            metadataContainer.innerHTML = `
                <h5>Image Metadata</h5>
                <p>Format: ${metadata.format}</p>
                <p>Size: ${metadata.size[0]}x${metadata.size[1]}</p>
                <p>Mode: ${metadata.mode}</p>
            `;
            
            // Display main image
            mainImage.src = data.filters.original;
            
            // Create filter grid
            const filters = data.filters;
            Object.entries(filters).forEach(([filterName, imageData]) => {
                const col = document.createElement('div');
                col.className = 'col-md-4 col-sm-6 mb-3';
                
                // Capitalize and format filter name
                const formattedFilterName = filterName.charAt(0).toUpperCase() + filterName.slice(1);
                
                col.innerHTML = `
                    <div class="filter-container">
                        <img src="${imageData}" 
                             class="img-fluid filter-preview" 
                             alt="${formattedFilterName}"
                             onclick="updateMainImage('${imageData}', '${formattedFilterName}')">
                        <div class="filter-label">${formattedFilterName}</div>
                        <div class="btn-group position-absolute top-0 end-0 m-2">
                            <button class="btn btn-sm btn-primary" 
                                    onclick="updateMainImage('${imageData}', '${formattedFilterName}')" 
                                    data-bs-dismiss="modal">
                                <i class="fas fa-check me-1"></i>Display
                            </button>
                            <button class="btn btn-sm btn-secondary"
                                    onclick="downloadImage('${filterName}', '${imageData}')">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                `;
                filterGrid.appendChild(col);
            });
        })
        .catch(error => {
            alert('Error processing image: ' + error.message);
        })
        .finally(() => {
            loadingSpinner.classList.add('d-none');
        });
    }
});

function updateMainImage(imageData, filterName) {
    document.getElementById('mainImage').src = imageData;
    
    // Show active filter notification
    const notification = document.getElementById('activeFilterNotification');
    notification.textContent = `Active Filter: ${filterName}`;
    notification.classList.remove('d-none');
    
    // Hide notification after 60 seconds
    setTimeout(() => {
        notification.classList.add('d-none');
    }, 60000);
}

function downloadImage(filterName, imageData) {
    fetch(`/download/${filterName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data: imageData })
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filtered_image_${filterName}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    })
    .catch(error => {
        alert('Error downloading image: ' + error.message);
    });
}

let currentZoom = 1;
const ZOOM_STEP = 0.1;
const MAX_ZOOM = 3;
const MIN_ZOOM = 0.5;

let isDragging = false;
let startX, startY;
let translateX = 0;
let translateY = 0;
let lastTranslateX = 0;
let lastTranslateY = 0;

function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
        const oldZoom = currentZoom;
        currentZoom += ZOOM_STEP;
        applyZoom(oldZoom);
    }
}

function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
        const oldZoom = currentZoom;
        currentZoom -= ZOOM_STEP;
        applyZoom(oldZoom);
    }
}

function resetZoom() {
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    lastTranslateX = 0;
    lastTranslateY = 0;
    applyZoom(currentZoom);
}

function applyZoom(oldZoom) {
    const image = document.getElementById('mainImage');
    const container = document.getElementById('imageContainer');
    
    // Update transform
    image.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
    
    // Update cursor and class based on zoom level
    if (currentZoom > 1) {
        image.classList.add('zoomed');
    } else {
        image.classList.remove('zoomed');
    }
    
    // Adjust translation to maintain center point during zoom
    if (oldZoom !== currentZoom) {
        const zoomRatio = currentZoom / oldZoom;
        translateX *= zoomRatio;
        translateY *= zoomRatio;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
    }
    
    // Ensure image stays within container bounds
    const bounds = calculateBounds(image, container);
    if (bounds) {
        translateX = Math.max(bounds.minX, Math.min(bounds.maxX, translateX));
        translateY = Math.max(bounds.minY, Math.min(bounds.maxY, translateY));
        image.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
    }
}

function calculateBounds(image, container) {
    if (!image || !container) return null;
    
    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    
    const minX = (containerRect.width - imageRect.width) / 2 / currentZoom;
    const maxX = -minX;
    const minY = (containerRect.height - imageRect.height) / 2 / currentZoom;
    const maxY = -minY;
    
    return { minX, maxX, minY, maxY };
}

// Initialize pan and zoom functionality
document.addEventListener('DOMContentLoaded', function() {
    const image = document.getElementById('mainImage');
    const container = document.getElementById('imageContainer');
    
    if (!image || !container) return;
    
    // Mouse wheel zoom
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });
    
    // Mouse events for panning
    image.addEventListener('mousedown', (e) => {
        if (currentZoom <= 1) return;
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        image.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyZoom(currentZoom);
    });
    
    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
        image.style.cursor = 'move';
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (currentZoom > 1) {
            applyZoom(currentZoom);
        }
    });
});

function saveZoomedImage() {
    const image = document.getElementById('mainImage');
    const container = document.getElementById('imageContainer');
    
    if (!image || !container || image.src.includes('placeholder.svg')) {
        return;
    }

    // Create canvas with container dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match visible area
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Calculate source rectangle (visible portion of original image)
    const imageRect = image.getBoundingClientRect();
    const scale = image.naturalWidth / (imageRect.width / currentZoom);
    
    // Calculate the visible portion coordinates in the original image
    const sourceX = (-translateX * scale / currentZoom) + (image.naturalWidth - canvas.width * scale) / 2;
    const sourceY = (-translateY * scale / currentZoom) + (image.naturalHeight - canvas.height * scale) / 2;
    const sourceWidth = canvas.width * scale;
    const sourceHeight = canvas.height * scale;
    
    // Draw the visible portion
    ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );
    
    // Convert to base64 and send to server
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    
    fetch('/download/zoomed', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data: imageData })
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'zoomed_image.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => console.error('Error saving image:', error));
}
// Handle filter parameter changes
function updateFilterParameters() {
    const formData = new FormData();
    formData.append('file', currentImage);
    formData.append('sharpen_intensity', document.getElementById('sharpenIntensity').value);
    formData.append('emboss_strength', document.getElementById('embossStrength').value);
    formData.append('saturation_factor', document.getElementById('saturationFactor').value);
    formData.append('edge_threshold1', document.getElementById('edgeThreshold1').value);
    formData.append('edge_threshold2', document.getElementById('edgeThreshold2').value);
    formData.append('hue_shift', document.getElementById('hueShift').value);
    formData.append('sepia_intensity', document.getElementById('sepiaIntensity').value);
    formData.append('vibrance_factor', document.getElementById('vibranceFactor').value);
    formData.append('vignette_intensity', document.getElementById('vignetteIntensity').value);
    formData.append('noise_reduction_strength', document.getElementById('noiseReductionStrength').value);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayFilters(data.filters);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Update value displays and trigger filter update
document.addEventListener('DOMContentLoaded', function() {
    const parameterIds = ['sharpenIntensity', 'embossStrength', 'saturationFactor', 
                         'edgeThreshold1', 'edgeThreshold2', 'hueShift',
                         'sepiaIntensity', 'vibranceFactor', 'vignetteIntensity', 'noiseReductionStrength'];
    
    parameterIds.forEach(id => {
        const input = document.getElementById(id);
        const valueSpan = document.getElementById(id.replace('Intensity', 'Value')
                                                 .replace('Strength', 'Value')
                                                 .replace('Factor', 'Value')
                                                 .replace('Threshold', 'Value')
                                                 .replace('Shift', 'Value'));
        
        if (input && valueSpan) {
            input.addEventListener('input', function() {
                valueSpan.textContent = this.value;
            });
            
            input.addEventListener('change', updateFilterParameters);
        }
    });
});

function clearImage() {
    const mainImage = document.getElementById('mainImage');
    mainImage.src = '/static/img/placeholder.svg';
    
    // Reset zoom
    currentZoom = 1;
    applyZoom();
    
    // Clear metadata
    const metadataContainer = document.getElementById('metadata');
    metadataContainer.innerHTML = '<p class="text-center text-muted">Upload an image to view metadata</p>';
    
    // Clear filter grid
    const filterGrid = document.getElementById('filterGrid');
    if (filterGrid) {
        filterGrid.innerHTML = '';
    }
}

// Wait for DOM to load before adding event listeners
// Batch processing functionality
let currentBatchImages = [];

async function handleMultipleFiles(files) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.classList.remove('d-none');
    
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        currentBatchImages.push({
                            name: file.name,
                            data: data
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing file:', error);
            }
        }
    }
    
    displayBatchResults();
    loadingSpinner.classList.add('d-none');
}

function displayBatchResults() {
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '';
    
    const batchGrid = document.createElement('div');
    batchGrid.className = 'row g-3';
    
    currentBatchImages.forEach((img, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        const card = document.createElement('div');
        card.className = 'card h-100';
        
        const image = document.createElement('img');
        image.src = img.data.filters.original;
        image.className = 'card-img-top';
        image.alt = img.name;
        
        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';
        
        const title = document.createElement('h5');
        title.className = 'card-title';
        title.textContent = img.name;
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-primary me-2';
        viewBtn.textContent = 'View Filters';
        viewBtn.onclick = () => viewImageFilters(index);
        
        cardBody.appendChild(title);
        cardBody.appendChild(viewBtn);
        card.appendChild(image);
        card.appendChild(cardBody);
        col.appendChild(card);
        batchGrid.appendChild(col);
    });
    
    imageContainer.appendChild(batchGrid);
}

function viewImageFilters(index) {
    const img = currentBatchImages[index];
    currentImage = img.data;
    displayFilters(img.data.filters);
    updateMetadata(img.data.metadata);
    
    const modal = new bootstrap.Modal(document.getElementById('filtersModal'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    const mainImage = document.getElementById('mainImage');
    const imageContainer = document.getElementById('imageContainer');
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            handleMultipleFiles(this.files);
        }
    });
});