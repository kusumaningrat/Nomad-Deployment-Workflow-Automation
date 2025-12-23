import json, os, nomad, yaml
from flask import Flask, render_template_string, render_template, request, jsonify
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from dotenv import load_dotenv


from database import db_preparation
from vault import write_kv2_secret, ensure_kv2_mount, get_vault_client, load_repo_map
from gitops import push_to_github
from util import resolve_repo_url

registry_env = load_dotenv('.env')

# --- Flask Initialization ---
app = Flask(__name__)

@app.route('/')
def index():
    
    with open('templates/index.html', 'r') as f:
        html_content = f.read()
    return render_template_string(html_content)


@app.route('/generate_job', methods=['POST'])
def generate_job():
    try:
        data = request.json or {}

        job_name = data.get('job_name', 'default-service')
        datacenter_name = data.get('datacenter_name', 'glynac-dc')
        namespace = data.get('namespace', 'default')
        exposed_port = int(data.get('exposed_port'))
        container_port = int(data.get('container_port'))
        worker_name = data.get('worker_name', 'Worker-01')
        vault_role  = data.get('vault_role')
        vault_path  = data.get('vault_path')
        cpu = int(data.get('cpu', 500))
        memory = data.get('memory', '256')
        node = data.get('node', 'general')

        REGISTRY_MAP = {
            "redtail": "redtail",
            "emoney": "emoney-advisor",
            "wealthbox": "wealthbox",
            "orion": "orion",
            "hubspot": "hubspot"
        }

        vault_yaml_raw = data.get('vault_yaml', '')
        vault_path = None
        env = {}

        if vault_yaml_raw:
            vault_cfg = yaml.safe_load(vault_yaml_raw)
            if not isinstance(vault_cfg, dict):
                raise ValueError("vault_yaml must be valid YAML")

            vault_path = vault_cfg.get('vault_path')
            env = vault_cfg.get('env', {})

            if not isinstance(env, dict):
                raise ValueError("env must be a dictionary")
            
        job_name_lower = job_name.casefold()

        registry_name = next(
            (v for k, v in REGISTRY_MAP.items() if k in job_name_lower),
            None
        )
        registry_user = os.getenv('REGISTRY_USERNAME')
        registry_pass = os.getenv('REGISTRY_PASSWORD')


        generated_hcl = render_template(
            'nomad/job.hcl.j2',
            job_name=job_name,
            datacenter_name=datacenter_name,
            namespace=namespace,
            exposed_port=exposed_port,
            container_port=container_port,
            worker_name=worker_name,
            vault_role=vault_role,
            vault_path=vault_path,
            registry_name=registry_name,
            registry_user=registry_user,
            registry_pass=registry_pass,
            env=env,
            cpu=cpu,
            memory=memory,
            node=node,
        )


        return jsonify({'success': True, 'hcl': generated_hcl})
    except Exception as e:
        app.logger.error(f"Error during job generation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/generate_ci', methods=['POST'])
def generate_ci():
    try:
        data = request.json or {}

        job_name = data.get('job_name', 'default-service')

        REGISTRY_MAP = {
            "redtail": "redtail",
            "emoney": "emoney-advisor",
            "wealthbox": "wealthbox",
            "orion": "orion"
        }

        job_name_lower = job_name.casefold()

        registry_name = next(
            (v for k, v in REGISTRY_MAP.items() if k in job_name_lower),
            None
        )


        generated_ci = render_template(
            'github_actions/ci.yaml.j2',
            job_name=job_name,
            registry_name=registry_name,
        )

        # push_nomad_job_to_github()
        # print(jsonify({'success': True, 'ci-config': generated_ci}))

        repo_map_raw = load_repo_map()
        repo_map = repo_map_raw.get("data", {})
        repo_url = resolve_repo_url(job_name, repo_map)

        if not repo_url:
            return jsonify({
                "success": False,
                "error": f"No repo found for job_name '{job_name}'"
            }), 400

        push_to_github(
            repo_url=repo_url,
            branch="main",
            target_path=f".github/workflows/{job_name}-ci.yml",
            content=generated_ci,
            commit_message=f"feat(deployment): add/update {job_name}"
        )


        return jsonify({'success': True, 'ci-config': generated_ci})
    except Exception as e:
        app.logger.error(f"Error during ci generation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/db_prepare', methods=['POST'])
def deploy_db():
    try:
        data = request.json or {}
        db_cfg = data.get('database', {})
        db_name = db_cfg.get('name')
        if not db_name:
            return jsonify({"success": False, "error": "database.name is required"}), 400

        db_preparation(db_name=db_name)

        return jsonify({"success": True, "message": f"Database {db_name} created."})

    except Exception as e:
        app.logger.error(f"DB Deployment failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    
@app.route('/deploy_vault', methods=['POST'])
def deploy_vault():
    try:
        data = request.json or {}
        vault_yaml_raw = data.get('vault_yaml', '')

        if vault_yaml_raw:
            vault_cfg = yaml.safe_load(vault_yaml_raw)
            if not isinstance(vault_cfg, dict):
                raise ValueError("vault_yaml must be valid YAML")

            vault_path = vault_cfg.get("vault_path")
            secrets = vault_cfg.get("env", {})

            if vault_path and isinstance(secrets, dict) and secrets:
                client = get_vault_client()
                ensure_kv2_mount(client)
                write_kv2_secret(client=client, secret_path=vault_path, data=secrets)

        return jsonify({"success": True, "message": f"Vault secrets created at {vault_path}"})

    except Exception as e:
        app.logger.error(f"Vault deployment failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/deploy_git', methods=['POST'])
def deploy_git():
    try:
        data = request.json or {}
        job_name = data.get('job_name')
        hclOutput = data.get('hclOutput')

        repo_map_raw = load_repo_map()
        repo_map = repo_map_raw.get("data", {})
        repo_url = resolve_repo_url(job_name, repo_map)

        
        if not job_name or not hclOutput:
            return jsonify({"success": False, "error": "job_name and hclOutput required"}), 400
        
        if not repo_url:
            return jsonify({
                "success": False,
                "error": f"No repo found for job_name '{job_name}'"
            }), 400

        result = push_to_github(
            repo_url=repo_url,
            branch="main",
            target_path=f"nomad/{job_name}.hcl",
            content=hclOutput,
            commit_message=f"feat(deployment): add/update {job_name}"
        )

        return jsonify({"success": True, "message": result.get('message', 'Pushed')})

    except Exception as e:
        app.logger.error(f"Git deployment failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)