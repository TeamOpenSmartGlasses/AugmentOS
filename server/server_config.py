gcp_project_id = ""
google_maps_api_key = ""
serper_api_key = ""
openai_api_key = ""
wolframalpha_api_key = ""
clear_users_on_start = True
clear_cache_on_start = False

use_azure_openai = False
azure_openai_api_key=""
azure_openai_api_base=""
azure_openai_api_gpt35_deployment=""
azure_openai_api_gpt4_deployment=""

azure_api_llama_13b_chat_endpoint = ""
azure_api_llama_13b_chat_api_key = ""

time_everything_spreadsheet_id = ""

# Uncomment one of the following configs:
# Local:
database_uri = "mongodb://localhost:27017"
server_port = 8080
path_modifier = ""

# These are for use with official Convoscope(tm) backend - ignore if self-hosting

# Prod:
#database_uri = "mongodb://localhost:27018"
#server_port = 8080
#path_modifier = ""

# Dev: 
#database_uri = "mongodb://localhost:27019"
#server_port = 8081
#path_modifier = "dev/"

# Dev2:
#database_uri = "mongodb://localhost:27020"
#server_port = 8082
#path_modifier = "dev2/"

# MIT:
#database_uri = "mongodb://localhost:27021"
#server_port = 8083
#path_modifier = "mit/"
