from scipy import stats
import sys
from flask import Flask, request
import json

# flask --app ./server/correlation run --debug

app = Flask(__name__)

# Calc spearman correlation
@app.route('/correlation', methods = ['POST']) 
def correlation(): 
    data = request.get_json()
    res = stats.spearmanr(data['x'], data['y'])
    # Return data in json format 
    return json.dumps({ "rho": res.statistic, "p": res.pvalue, "n": len(data['x']) })

# Get server status
@app.route('/status', methods = ['GET']) 
def status():
    # Return data in json format 
    return json.dumps({ "status": "on" })

if __name__ == "__main__": 
    app.run(port=5000)