job "Nomad-Workflow-Automation" {
  datacenters = ["<dc_name>"]
  type        = "service"
  namespace   = "<namespace_or_default"


  group "workflow-automation" {
    constraint {
      attribute = "${attr.unique.hostname}"
      value     = "<worker_name>"
    }

    task "workflow-automation" {
      driver = "docker"

      config {
        image = "<container_image>"
        auth {
          username       = "<registry_user>"
          password       = "<registry_pass>"
          server_address = "<registry_url>"
        }
      }

      service {
        tags = ["public", "logs.promtail"]
        name = "nomad-workflow-automation"
      }

      vault {
        role = "nomad-workflow"
      }


      template {
        destination = "secrets/env"
        env         = true
        data        = <<EOF

DB_HOST="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.DB_HOST }}{{ end }}"
DB_NAME="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.DB_NAME }}{{ end }}"
DB_PASS="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.DB_PASS }}{{ end }}"
DB_USER="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.DB_USER }}{{ end }}"

REGISTRY_PASSWORD="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.REGISTRY_PASSWORD }}{{ end }}"
REGISTRY_USERNAME="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.REGISTRY_USERNAME }}{{ end }}"

VAULT_ADDR="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.VAULT_ADDR }}{{ end }}"
VAULT_TOKEN="{{ with secret "secrets/workflow-automation/nomad" }}{{ .Data.data.VAULT_TOKEN }}{{ end }}"
EOF
      }

      resources {
        cpu    = 80
        memory = 80
      }
    }
  }
}