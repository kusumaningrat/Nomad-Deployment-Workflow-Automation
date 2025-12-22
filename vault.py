import os
import hvac

VAULT_ADDR = os.getenv("VAULT_ADDR")
VAULT_TOKEN = os.getenv("VAULT_TOKEN")
BASE_MOUNT = "secrets"


def get_vault_client():
    client = hvac.Client(url=VAULT_ADDR, token=VAULT_TOKEN)
    if not client.is_authenticated():
        raise RuntimeError("Vault authentication failed")
    return client


def ensure_kv2_mount(client, mount_point=BASE_MOUNT):
    mounts = client.sys.list_mounted_secrets_engines()
    if f"{mount_point}/" not in mounts:
        client.sys.enable_secrets_engine(
            backend_type="kv",
            path=mount_point,
            options={"version": "2"},
        )


def write_kv2_secret(client, secret_path, data, mount_point=BASE_MOUNT):
    """
    Writes to: secrets/<service>/<secret_path>
    """
    full_path = f"{secret_path}"
    print("vault path", full_path)
    client.secrets.kv.v2.create_or_update_secret(
        mount_point=mount_point,
        path=full_path,
        secret=data,
    )