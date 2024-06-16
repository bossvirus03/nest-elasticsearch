import {
  getElasticsearchClient,
  getUserMongoClient,
} from '../migrations-utils/db';

export async function up() {
  let userClient = null;
  let elasticSearch = null;

  try {
    userClient = await getUserMongoClient();
    elasticSearch = await getElasticsearchClient();
    /*
       Code your update script here!
    */
  } catch (error) {
    console.log(error);
  }
}

export async function down() {
  /*
       Code you downgrade script here!
*/
}
// docker exec es-container-t plugin install icu_folding
