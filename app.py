
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# The base URL for the radio-browser API
API_BASE_URL = "http://de1.api.radio-browser.info/json"

@app.route('/')
def index():
    """
    Serves the main HTML page.
    """
    return render_template('index.html')

@app.route('/api/stations')
def get_stations():
    """
    Fetches a list of radio stations from the radio-browser API.
    
    - Searches for the top 500 stations by click count.
    - Filters for stations that have GPS coordinates.
    - Returns a JSON response with the station data.
    """
    try:
        # Search for stations, ordered by click count, limit to 500
        # We also filter for stations that have geo_lat and geo_long defined.
        params = {
            'order': 'clickcount',
            'reverse': 'true',
            'limit': '2000',
            'has_geo_info': 'true',
            'hidebroken': 'true'
        }
        response = requests.get(f"{API_BASE_URL}/stations/search", params=params)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        stations = response.json()
        
        # We can optionally filter or clean up the data more here if needed
        
        return jsonify(stations)

    except requests.exceptions.RequestException as e:
        # Handle network errors or bad responses from the API
        print(f"Error fetching stations: {e}")
        return jsonify({"error": "Failed to fetch stations from the external API"}), 500

if __name__ == '__main__':
    app.run(debug=True)
