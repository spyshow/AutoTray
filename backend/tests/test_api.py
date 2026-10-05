from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["engine"] == "AutoTray-Router"
    assert data["status"] == "online"


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_calculate_sizing_api():
    payload = {
        "parameters": {
            "spare_margin_pct": 20.0,
            "control_fill_pct": 40.0,
            "default_tray_height_mm": 60.0,
            "add_metallic_divider": False,
            "divider_width_mm": 15.0,
        },
        "branches": [
            {
                "branch_id": "BR_L1_01",
                "node_from": "MCC_L1",
                "node_to": "JUNC_L1_EAST",
                "level": "Level 1",
                "branch_type": "horizontal",
                "length_m": 14.5,
                "tray_height_mm": 60.0,
            },
            {
                "branch_id": "RISER_E_L1_L2",
                "node_from": "JUNC_L1_EAST",
                "node_to": "RISER_EAST_L2",
                "level": "Transition",
                "branch_type": "vertical",
                "length_m": 4.5,
                "tray_height_mm": 100.0,
            },
        ],
        "cables": [
            {
                "cable_tag": "C_PWR_01",
                "source_node": "MCC_L1",
                "dest_node": "RISER_EAST_L2",
                "cable_type": "power",
                "od_mm": 22.4,
                "count": 1,
            }
        ],
    }

    response = client.post("/api/v1/calculate-sizing", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["summary"]["total_cables_routed"] == 1
    assert len(data["summary"]["unrouted_cables"]) == 0
    assert len(data["branches"]) == 2
    assert data["branches"][0]["cable_count"] == 1
    assert data["branches"][1]["cable_count"] == 1
    assert data["branches"][0]["status"] == "OK"


def test_export_excel_api():
    # First get calculation response
    calc_payload = {
        "parameters": {
            "spare_margin_pct": 20.0,
            "control_fill_pct": 40.0,
            "default_tray_height_mm": 60.0,
        },
        "branches": [
            {
                "branch_id": "BR_01",
                "node_from": "A",
                "node_to": "B",
                "level": "Level 1",
                "branch_type": "horizontal",
                "length_m": 10.0,
            }
        ],
        "cables": [
            {
                "cable_tag": "C1",
                "source_node": "A",
                "dest_node": "B",
                "cable_type": "power",
                "od_mm": 25.0,
                "count": 1,
            }
        ],
    }
    calc_res = client.post("/api/v1/calculate-sizing", json=calc_payload)
    assert calc_res.status_code == 200
    calc_data = calc_res.json()

    export_res = client.post("/api/v1/export-excel", json=calc_data)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(export_res.content) > 1000


def test_download_sample_template_api():
    res = client.get("/api/v1/sample-template")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(res.content) > 1000
