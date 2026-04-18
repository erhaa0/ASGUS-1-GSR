import numpy as np
from sklearn.cluster import DBSCAN

def run_dbscan(sightings: list, eps: float = 0.5, min_samples: int = 2):
    """
    Takes a list of locust sighting coordinates and finds swarm clusters.
    
    sightings  : list of dicts → [{"lat": 30.2, "lon": 66.9}, ...]
    eps        : max distance between points to be in same cluster (degrees)
    min_samples: min sightings needed to form a cluster (swarm)
    
    Returns list of cluster results
    """

    print("\n" + "=" * 50)
    print("LC-EWS - DBSCAN Swarm Detection")
    print("=" * 50)

    # ── 1. Need at least 2 sightings ─────────────────
    if len(sightings) < 2:
        print("[WARN] Not enough sightings to detect swarm (need 2+)")
        return {
            "clusters":     [],
            "noise_count":  len(sightings),
            "swarm_found":  False,
            "risk_level":   "Low",
            "risk_score":   0.0
        }

    # ── 2. Convert to numpy array ─────────────────────
    coords = np.array([[s["lat"], s["lon"]] for s in sightings])
    print(f"[OK] Sightings received: {len(coords)}")

    # ── 3. Run DBSCAN ─────────────────────────────────
    db = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
    labels = db.labels_

    # label = -1 means noise (lone sighting, not a swarm)
    unique_labels = set(labels)
    cluster_ids   = [l for l in unique_labels if l != -1]
    noise_count   = list(labels).count(-1)

    print(f"[OK] Clusters found : {len(cluster_ids)}")
    print(f"[OK] Noise points   : {noise_count} (isolated sightings)")

    # ── 4. Build cluster details ──────────────────────
    clusters = []

    for cluster_id in cluster_ids:
        # Get all points in this cluster
        cluster_points = coords[labels == cluster_id]
        size = len(cluster_points)

        # Centroid = average lat/lon of cluster
        centroid_lat = round(float(np.mean(cluster_points[:, 0])), 4)
        centroid_lon = round(float(np.mean(cluster_points[:, 1])), 4)

        # Risk based on cluster size
        if size >= 6:
            risk_level = "Critical"
            risk_score = 0.95
        elif size >= 4:
            risk_level = "High"
            risk_score = 0.75
        elif size >= 2:
            risk_level = "Medium"
            risk_score = 0.50
        else:
            risk_level = "Low"
            risk_score = 0.25

        cluster_info = {
            "cluster_id":    int(cluster_id),
            "size":          size,
            "centroid_lat":  centroid_lat,
            "centroid_lon":  centroid_lon,
            "risk_level":    risk_level,
            "risk_score":    risk_score,
            "points":        cluster_points.tolist()
        }

        clusters.append(cluster_info)

        print(f"\n  Cluster {cluster_id}:")
        print(f"    Size       : {size} sightings")
        print(f"    Center     : ({centroid_lat}, {centroid_lon})")
        print(f"    Risk Level : {risk_level}")
        print(f"    Risk Score : {risk_score}")

    # ── 5. Overall risk = highest cluster risk ────────
    if clusters:
        overall_risk  = max(clusters, key=lambda c: c["risk_score"])
        overall_level = overall_risk["risk_level"]
        overall_score = overall_risk["risk_score"]
        swarm_found   = True
    else:
        overall_level = "Low"
        overall_score = 0.0
        swarm_found   = False

    print(f"\n{'=' * 50}")
    print(f"OVERALL RISK  : {overall_level}")
    print(f"OVERALL SCORE : {overall_score}")
    print(f"SWARM FOUND   : {swarm_found}")
    print(f"{'=' * 50}\n")

    return {
        "clusters":    clusters,
        "noise_count": noise_count,
        "swarm_found": swarm_found,
        "risk_level":  overall_level,
        "risk_score":  overall_score
    }
