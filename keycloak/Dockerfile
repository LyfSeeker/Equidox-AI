# Keycloak for Railway / production-style deploy (not start-dev).
# Import runs on first boot when the realm is missing.
FROM quay.io/keycloak/keycloak:26.0

COPY equidox-realm.json /opt/keycloak/data/import/equidox-realm.json

# Railway / reverse proxies: set KC_HOSTNAME, KC_PROXY_HEADERS, and DB vars in the service.
# After first deploy, update the equidox-frontend client redirect URIs to your frontend URL
# (see docs/RAILWAY.md). Localhost URIs in the imported realm are for local Docker only.

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--import-realm", "--http-enabled=true", "--hostname-strict=false"]
