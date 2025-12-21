import json, sys, nomad, yaml
from flask import Flask, render_template_string, render_template, request, jsonify
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
from database import create_database

# --- Flask Initialization ---
app = Flask(__name__)

# --- Jinja2 Template for Nomad Job (HCL) ---


nomad_instance = nomad.Nomad(host="http://139.59.117.80:4646", token="53f0b60f-23a5-c1ae-4638-2cf9623223e4")

@app.route('/')
def index():
    
    with open('templates/index.html', 'r') as f:
        html_content = f.read()
    return render_template_string(html_content)

def get_nomad_namespace():
    namespaces = nomad_instance.namespaces.get_namespaces()
    for ns in namespaces:
        print(ns['Name'])

@app.route('/generate_job', methods=['POST'])
def generate_job():
    """Generates the Nomad HCL job file using Jinja2 templating."""
    try:
        data = request.json or {}

        job_name = data.get('job_name', 'default-service')
        namespace = data.get('namespace', 'default')
        exposed_port = int(data.get('exposed_port'))
        container_port = int(data.get('container_port'))
        worker_name = data.get('worker_name', 'Worker-01')
        vault_role  = data.get('vault_role')
        vault_path  = data.get('vault_path')
        cpu = int(data.get('cpu', 500))
        memory = data.get('memory', '256')
        node = data.get('node', 'general')

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

        generated_hcl = render_template(
            'nomad/job.hcl.j2',
            job_name=job_name,
            namespace=namespace,
            exposed_port=exposed_port,
            container_port=container_port,
            worker_name=worker_name,
            vault_role=vault_role,
            vault_path=vault_path,
            env=env,
            cpu=cpu,
            memory=memory,
            node=node,
        )


        return jsonify({'success': True, 'hcl': generated_hcl})
    except Exception as e:
        app.logger.error(f"Error during job generation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/start_deployment', methods=['POST'])
def start_deployment():
    try:
        data = request.json or {}

        job_name = data.get('job_name')
        db_cfg = data.get('database', {})

        db_name = db_cfg.get('name')

        if not job_name or not db_name:
            return jsonify({
                "success": False,
                "error": "job_name and database.name are required"
            }), 400
        
        create_database(
            db_name=db_name
        )

        return jsonify({
            "success": True,
            "message": f"Deployment started for {job_name}",
            "database": db_name
        })

    except Exception as e:
        app.logger.error(f"Deployment failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)