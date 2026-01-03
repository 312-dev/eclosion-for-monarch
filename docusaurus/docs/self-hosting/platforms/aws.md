---
id: aws
title: AWS
sidebar_label: AWS
sidebar_position: 2
---

# AWS Deployment

Deploy Eclosion on AWS using ECS with Fargate or EC2.

## Using ECS with Fargate

### 1. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name eclosion-cluster
```

### 2. Create Task Definition

Save as `task-definition.json`:

```json
{
  "family": "eclosion",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "eclosion",
      "image": "ghcr.io/graysoncadams/eclosion:1.0.0",
      "portMappings": [
        {
          "containerPort": 5001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "INSTANCE_SECRET",
          "value": "your-secret-here"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "eclosion-data",
          "containerPath": "/app/state"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "python3 -c \"import urllib.request; urllib.request.urlopen('http://localhost:5001/health')\""],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ],
  "volumes": [
    {
      "name": "eclosion-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-xxxxxxxx"
      }
    }
  ]
}
```

### 3. Register and Run

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service \
  --cluster eclosion-cluster \
  --service-name eclosion \
  --task-definition eclosion \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Using EC2

Follow the [DigitalOcean Droplet](/self-hosting/platforms/digitalocean#using-a-droplet) instructions - the process is identical for any Linux VM.
