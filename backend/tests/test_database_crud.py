from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_projects_and_seed():
    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) >= 1
    # Check that demo project exists
    demo = next((p for p in projects if p["id"] == "PRJ_DEMO_01"), None)
    assert demo is not None
    assert demo["name"] == "Industrial Refinery - Multi-Level Riser"
    assert demo["branches_count"] >= 18
    assert demo["cables_count"] >= 17


def test_get_project_detail():
    response = client.get("/api/v1/projects/PRJ_DEMO_01")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "PRJ_DEMO_01"
    assert "parameters" in data
    assert len(data["branches"]) >= 18
    assert len(data["cables"]) >= 17
    assert data["latest_calculation"] is not None
    assert data["latest_calculation"]["summary"]["total_cables_routed"] >= 1


def test_create_update_delete_project():
    new_proj_payload = {
        "id": "PRJ_TEST_UNIT_01",
        "name": "Substation B Unit Test",
        "code": "SUB-B-01",
        "description": "Testing relational SQLite persistence",
        "parameters": {
            "spare_margin_pct": 25.0,
            "control_fill_pct": 35.0,
            "default_tray_height_mm": 100.0,
            "add_metallic_divider": True,
            "divider_width_mm": 20.0,
        },
        "branches": [
            {
                "branch_id": "TEST_BR_01",
                "node_from": "NODE_A",
                "node_to": "NODE_B",
                "level": "Ground",
                "branch_type": "horizontal",
                "length_m": 10.0,
                "tray_height_mm": 100.0,
            }
        ],
        "cables": [
            {
                "cable_tag": "TEST_CBL_01",
                "source_node": "NODE_A",
                "dest_node": "NODE_B",
                "cable_type": "power",
                "od_mm": 30.0,
                "count": 1,
            }
        ],
    }

    # 1. Create
    create_resp = client.post("/api/v1/projects", json=new_proj_payload)
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["id"] == "PRJ_TEST_UNIT_01"
    assert created["parameters"]["spare_margin_pct"] == 25.0
    assert len(created["branches"]) == 1
    assert len(created["cables"]) == 1

    # 2. Update
    update_payload = {
        "name": "Substation B - Renamed",
        "description": "Updated description",
        "parameters": {
            "spare_margin_pct": 30.0,
            "control_fill_pct": 35.0,
            "default_tray_height_mm": 100.0,
            "add_metallic_divider": True,
            "divider_width_mm": 20.0,
        },
    }
    update_resp = client.put("/api/v1/projects/PRJ_TEST_UNIT_01", json=update_payload)
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["name"] == "Substation B - Renamed"
    assert updated["parameters"]["spare_margin_pct"] == 30.0

    # 3. Calculate and Save
    calc_resp = client.post("/api/v1/projects/PRJ_TEST_UNIT_01/calculate")
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    assert calc_data["summary"]["total_cables_routed"] == 1
    assert calc_data["branches"][0]["branch_id"] == "TEST_BR_01"

    # Verify latest_calculation is returned on get
    get_resp = client.get("/api/v1/projects/PRJ_TEST_UNIT_01")
    assert get_resp.status_code == 200
    assert get_resp.json()["latest_calculation"] is not None

    # 4. Delete
    del_resp = client.delete("/api/v1/projects/PRJ_TEST_UNIT_01")
    assert del_resp.status_code == 200

    # Verify it is deleted
    get_after_del = client.get("/api/v1/projects/PRJ_TEST_UNIT_01")
    assert get_after_del.status_code == 404


def test_cable_catalog_endpoints():
    # 1. List catalog
    cat_resp = client.get("/api/v1/catalog")
    assert cat_resp.status_code == 200
    catalog = cat_resp.json()
    assert len(catalog) >= 50

    # 2. Search catalog
    search_resp = client.get("/api/v1/catalog?search=Flex")
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert len(results) > 0
    assert all("flex" in r["designation"].lower() or "flex" in r["category_label"].lower() for r in results)

    # 3. Add custom item
    custom_item = {
        "code": "CUSTOM-SPEC-HV-01",
        "category": "CUSTOM_HV",
        "category_label": "High Voltage Custom Feeder",
        "voltage": "11 kV",
        "cores": 3,
        "size_mm2": 185.0,
        "conductor_type": "Compacted Copper",
        "insulation_sheath": "XLPE/SWA/PVC",
        "standard": "IEC 60502-2",
        "designation": "3x185 mm² Armoured 11kV",
        "od_mm": 62.5,
        "weight_kg_km": 8500.0,
        "current_air_a": 450.0,
    }
    add_resp = client.post("/api/v1/catalog", json=custom_item)
    assert add_resp.status_code == 200
    assert add_resp.json()["code"] == "CUSTOM-SPEC-HV-01"

    # Verify retrieval
    query_resp = client.get("/api/v1/catalog?search=CUSTOM-SPEC-HV-01")
    assert query_resp.status_code == 200
    found = query_resp.json()
    assert len(found) == 1
    assert found[0]["od_mm"] == 62.5
