---
id: kubernetes
title: Kubernetes
sidebar_label: Kubernetes
sidebar_position: 4
---

# Kubernetes Deployment

Deploy Eclosion on any Kubernetes cluster with full manifests.

## Complete Kubernetes Manifests

Save as `eclosion-deployment.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: eclosion
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: eclosion-data
  namespace: eclosion
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Secret
metadata:
  name: eclosion-secret
  namespace: eclosion
type: Opaque
stringData:
  instance-secret: "your-secret-here"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eclosion
  namespace: eclosion
spec:
  replicas: 1
  selector:
    matchLabels:
      app: eclosion
  template:
    metadata:
      labels:
        app: eclosion
    spec:
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: eclosion
          image: ghcr.io/graysoncadams/eclosion:1.0.0
          ports:
            - containerPort: 5001
          env:
            - name: INSTANCE_SECRET
              valueFrom:
                secretKeyRef:
                  name: eclosion-secret
                  key: instance-secret
            - name: TZ
              value: "UTC"
          volumeMounts:
            - name: data
              mountPath: /app/state
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 5001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 5001
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: eclosion-data
---
apiVersion: v1
kind: Service
metadata:
  name: eclosion
  namespace: eclosion
spec:
  selector:
    app: eclosion
  ports:
    - port: 80
      targetPort: 5001
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: eclosion
  namespace: eclosion
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - eclosion.yourdomain.com
      secretName: eclosion-tls
  rules:
    - host: eclosion.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: eclosion
                port:
                  number: 80
```

## Apply the Manifests

```bash
kubectl apply -f eclosion-deployment.yaml
```

## Verify Deployment

```bash
# Check pods
kubectl get pods -n eclosion

# Check logs
kubectl logs -n eclosion -l app=eclosion

# Port forward for testing
kubectl port-forward -n eclosion svc/eclosion 5001:80
```
