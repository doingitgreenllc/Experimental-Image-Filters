import cv2
import numpy as np
import base64
import io

class ImageProcessor:
    def __init__(self, image):
        self.image = image
        
    def get_base64_image(self, img):
        """Convert OpenCV image to base64 string"""
        _, buffer = cv2.imencode('.jpg', img)
        return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
        
    def xray_effect(self):
        """Create X-ray like effect"""
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        inverted = cv2.bitwise_not(gray)
        return cv2.cvtColor(inverted, cv2.COLOR_GRAY2BGR)
        
    def sharpen(self, intensity=1.0):
        """Sharpen the image with customizable intensity"""
        kernel = np.array([
            [-1 * intensity, -1 * intensity, -1 * intensity],
            [-1 * intensity, 9 * intensity, -1 * intensity],
            [-1 * intensity, -1 * intensity, -1 * intensity]
        ])
        return cv2.filter2D(self.image, -1, kernel)
        
    def emboss(self, strength=1.0):
        """Create emboss effect with customizable strength"""
        kernel = np.array([
            [-2 * strength, -1 * strength, 0],
            [-1 * strength, 1, 1 * strength],
            [0, 1 * strength, 2 * strength]
        ])
        return cv2.filter2D(self.image, -1, kernel) + 128
        
    def adjust_saturation(self, factor=1.5):
        """Adjust image saturation"""
        hsv = cv2.cvtColor(self.image, cv2.COLOR_BGR2HSV)
        hsv[:,:,1] = np.clip(hsv[:,:,1] * factor, 0, 255)
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        
    def edge_detection(self, threshold1=100, threshold2=200):
        """Detect edges in the image with customizable thresholds"""
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, threshold1, threshold2)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        
    def adjust_hue(self, shift=0.5):
        """Adjust image hue"""
        hsv = cv2.cvtColor(self.image, cv2.COLOR_BGR2HSV)
        hsv[:,:,0] = (hsv[:,:,0] + shift * 180) % 180
        return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        
    def adjust_levels(self):
        """Adjust image levels"""
        lab = cv2.cvtColor(self.image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        adjusted = cv2.merge((cl,a,b))
        return cv2.cvtColor(adjusted, cv2.COLOR_LAB2BGR)
        
    def sketch_effect(self):
        """Create sketch effect"""
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        inv = 255 - gray
        blurred = cv2.GaussianBlur(inv, (21, 21), 0)
        inverted_blurred = 255 - blurred
        sketch = cv2.divide(gray, inverted_blurred, scale=256.0)
        return cv2.cvtColor(sketch, cv2.COLOR_GRAY2BGR)
        
    def sepia(self, intensity=0.5):
        """Apply sepia filter with adjustable intensity"""
        img_array = np.array(self.image, dtype=np.float64)
        sepia_matrix = np.array([
            [0.393 + 0.607 * (1 - intensity), 0.769 - 0.769 * (1 - intensity), 0.189 - 0.189 * (1 - intensity)],
            [0.349 - 0.349 * (1 - intensity), 0.686 + 0.314 * (1 - intensity), 0.168 - 0.168 * (1 - intensity)],
            [0.272 - 0.272 * (1 - intensity), 0.534 - 0.534 * (1 - intensity), 0.131 + 0.869 * (1 - intensity)]
        ])
        sepia_image = cv2.transform(img_array, sepia_matrix)
        sepia_image = np.clip(sepia_image, 0, 255).astype(np.uint8)
        return sepia_image
        
    def vibrance(self, factor=1.5):
        """Adjust image vibrance"""
        img_hsv = cv2.cvtColor(self.image, cv2.COLOR_BGR2HSV).astype(float)
        saturation = img_hsv[:, :, 1]
        mean_saturation = np.mean(saturation)
        mask = saturation > mean_saturation
        img_hsv[:, :, 1][mask] *= factor
        img_hsv[:, :, 1] = np.clip(img_hsv[:, :, 1], 0, 255)
        return cv2.cvtColor(img_hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        
    def vignette(self, intensity=1.0):
        """Apply vignette effect with adjustable intensity"""
        rows, cols = self.image.shape[:2]
        kernel_x = cv2.getGaussianKernel(cols, cols/2)
        kernel_y = cv2.getGaussianKernel(rows, rows/2)
        kernel = kernel_y * kernel_x.T
        mask = kernel / kernel.max()
        mask = np.power(mask, intensity)
        output = self.image.copy()
        for i in range(3):
            output[:, :, i] = output[:, :, i] * mask
        return output
        
    def noise_reduction(self, strength=7):
        """Apply noise reduction with adjustable strength"""
        strength = int(strength)
        if strength % 2 == 0:
            strength += 1
        return cv2.fastNlMeansDenoisingColored(self.image, None, 10, 10, strength, 21)
