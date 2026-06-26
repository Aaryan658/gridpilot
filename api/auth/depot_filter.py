from api.models.user import User

def apply_depot_filter(query, model, current_user: User):
    """
    Applies depot_id filter to any SQLAlchemy query.
    gridpilot_admin: no filter applied, sees all depots
    depot_admin: filter by current_user.depot_id
    """
    if current_user.role == "depot_admin":
        return query.filter(model.depot_id == current_user.depot_id)
    return query
