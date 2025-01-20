import os
import sys
import logging
from app import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        # Check if we're in development or production
        if os.environ.get('FLASK_ENV') == 'development':
            logger.info("Starting development server...")
            app.run(host="0.0.0.0", port=5000, debug=True)
        else:
            # Production: Let Gunicorn handle the serving
            import gunicorn.app.base
            logger.info("Starting production server with Gunicorn...")

            class StandaloneApplication(gunicorn.app.base.BaseApplication):
                def __init__(self, app, options=None):
                    self.options = options or {}
                    self.application = app
                    super().__init__()

                def load_config(self):
                    for key, value in self.options.items():
                        self.cfg.set(key, value)

                def load(self):
                    return self.application

            options = {
                'bind': '0.0.0.0:5000',
                'workers': 4,
                'worker_class': 'sync',
                'timeout': 120,
                'accesslog': '-',
                'errorlog': '-',
                'loglevel': 'info',
                'preload_app': True,
                'worker_tmp_dir': '/tmp'
            }

            StandaloneApplication(app, options).run()
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        sys.exit(1)
