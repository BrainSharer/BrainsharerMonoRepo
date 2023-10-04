import os, sys
from django.core.wsgi import get_wsgi_application
#os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'activebrainatlas.settings')
application = get_wsgi_application()
