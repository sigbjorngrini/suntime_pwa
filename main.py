import math
import json
import datetime
from js import console

def calculate_sun_times(latitude, longitude):
    """
    Calculate sunrise and sunset times for a given location.
    
    Args:
        latitude: Latitude in decimal degrees
        longitude: Longitude in decimal degrees
        
    Returns:
        JSON string with sunrise, sunset times and related information
    """
    try:
        # Get current date
        now = datetime.datetime.now()
        
        # Calculate day of year
        day_of_year = now.timetuple().tm_yday
        
        # Convert latitude and longitude from degrees to radians
        lat_rad = math.radians(latitude)
        
        # Calculate solar declination
        # Formula: 23.45 * sin(2π(284+N)/365) where N is the day of year
        declination = math.radians(23.45 * math.sin(2 * math.pi * (284 + day_of_year) / 365))
        
        # Calculate hour angle for sunrise/sunset
        # Formula: cos(hour_angle) = -tan(latitude) * tan(declination)
        cos_hour_angle = -math.tan(lat_rad) * math.tan(declination)
        
        # Check if we're in polar day or night
        if cos_hour_angle > 1.0:
            return json.dumps({
                "sunrise_time": "No sunrise",
                "sunset_time": "No sunset",
                "sunrise_info": "Polar night",
                "sunset_info": "Polar night",
                "day_length": "0h 0m"
            })
        elif cos_hour_angle < -1.0:
            return json.dumps({
                "sunrise_time": "No sunrise",
                "sunset_time": "No sunset",
                "sunrise_info": "Midnight sun",
                "sunset_info": "Midnight sun",
                "day_length": "24h 0m"
            })
        
        # Calculate hour angle in radians
        hour_angle = math.acos(cos_hour_angle)
        
        # Convert hour angle to hours
        hour_angle_hours = math.degrees(hour_angle) / 15
        
        # Calculate solar noon (in hours, UTC)
        # Formula: 12 - longitude/15
        solar_noon = 12 - longitude / 15
        
        # Calculate sunrise and sunset times (in hours, UTC)
        sunrise_time_utc = solar_noon - hour_angle_hours
        sunset_time_utc = solar_noon + hour_angle_hours
        
        # Convert to local time
        # Get timezone offset in hours
        local_tz_offset = -now.astimezone().utcoffset().total_seconds() / 3600
        
        sunrise_time_local = sunrise_time_utc - local_tz_offset
        sunset_time_local = sunset_time_utc - local_tz_offset
        
        # Handle times that wrap around to the next or previous day
        if sunrise_time_local < 0:
            sunrise_time_local += 24
        elif sunrise_time_local >= 24:
            sunrise_time_local -= 24
            
        if sunset_time_local < 0:
            sunset_time_local += 24
        elif sunset_time_local >= 24:
            sunset_time_local -= 24
        
        # Format times as HH:MM
        def format_time(hours):
            h = int(hours)
            m = int((hours - h) * 60)
            return f"{h:02d}:{m:02d}"
        
        sunrise_formatted = format_time(sunrise_time_local)
        sunset_formatted = format_time(sunset_time_local)
        
        # Calculate day length
        day_length_hours = 2 * hour_angle_hours
        day_length_h = int(day_length_hours)
        day_length_m = int((day_length_hours - day_length_h) * 60)
        day_length_formatted = f"{day_length_h}h {day_length_m}m"
        
        # Calculate additional info
        current_hour = now.hour + now.minute / 60
        
        if current_hour < sunrise_time_local:
            sunrise_info = f"Sunrise in {format_time(sunrise_time_local - current_hour)}"
            sunset_info = f"Sunset in {format_time(sunset_time_local - current_hour)}"
        elif current_hour < sunset_time_local:
            sunrise_info = f"Sunrise was {format_time(current_hour - sunrise_time_local)} ago"
            sunset_info = f"Sunset in {format_time(sunset_time_local - current_hour)}"
        else:
            # After sunset
            next_sunrise = sunrise_time_local + 24 if sunrise_time_local < current_hour else sunrise_time_local
            sunrise_info = f"Sunrise in {format_time(next_sunrise - current_hour)}"
            sunset_info = f"Sunset was {format_time(current_hour - sunset_time_local)} ago"
        
        # Return the results as JSON
        return json.dumps({
            "sunrise_time": sunrise_formatted,
            "sunset_time": sunset_formatted,
            "sunrise_info": sunrise_info,
            "sunset_info": sunset_info,
            "day_length": day_length_formatted
        })
        
    except Exception as e:
        console.error(f"Python error: {str(e)}")
        return json.dumps({
            "error": str(e)
        })
