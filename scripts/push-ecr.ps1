param(
  [string]$Region = "us-east-2",
  [string]$Registry = "701527496236.dkr.ecr.us-east-2.amazonaws.com",
  [string]$BackendRepo = "nila-backend",
  [string]$FrontendRepo = "nila-frontend",
  [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Import-Module AWS.Tools.ECR -Force

function Ensure-EcrRepo([string]$repoName) {
  $exists = $false
  try {
    $null = Get-ECRRepository -RepositoryName $repoName -Region $Region -ErrorAction Stop
    $exists = $true
  } catch {
    $exists = $false
  }
  if (-not $exists) {
    New-ECRRepository -RepositoryName $repoName -ImageTagMutability MUTABLE -ImageScanningConfiguration_ScanOnPush $true -Region $Region | Out-Null
    Write-Host "Created ECR repo: $repoName"
  } else {
    Write-Host "ECR repo exists: $repoName"
  }
}

Ensure-EcrRepo $BackendRepo
Ensure-EcrRepo $FrontendRepo

(Get-ECRLoginCommand -Region $Region).Password | docker login --username AWS --password-stdin $Registry

docker build -t $BackendRepo ./backend
docker tag "${BackendRepo}:${Tag}" "${Registry}/${BackendRepo}:${Tag}"
docker push "${Registry}/${BackendRepo}:${Tag}"

docker build -t $FrontendRepo -f ./frontend/Dockerfile.prod ./frontend
docker tag "${FrontendRepo}:${Tag}" "${Registry}/${FrontendRepo}:${Tag}"
docker push "${Registry}/${FrontendRepo}:${Tag}"

Write-Host "Done. Pushed:"
Write-Host " - ${Registry}/${BackendRepo}:${Tag}"
Write-Host " - ${Registry}/${FrontendRepo}:${Tag}"
