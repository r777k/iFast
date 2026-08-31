def calculate_fasting_phase(elapsed_hours: float, target_hours: float) -> str:
    """
    Determines the fasting phase based on the percentage of the target completed.
    """
    if target_hours <= 0:
        return "Unknown"
        
    percent_complete = (elapsed_hours / target_hours) * 100
    
    if percent_complete < 25:
        return "Ramp-up"
    elif percent_complete < 75:
        return "Fat Burning"
    elif percent_complete < 100:
        return "Deep Fast"
    else:
        return "Extended / Over-achievement"