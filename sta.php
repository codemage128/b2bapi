<?php
//db stuff
$conn  = new MongoClient( "mongodb://localhost:27017 ");
       			if (!$conn) {
       				die('Error Connecting to DB using driver MongoDB');
       			}
       			$db = $conn->selectDB("padb");
                   /*
                   1. getting Sum of all balances from the system
                   2. getting provider balances 
                   3. getting top 5 countries used for topups (count)
                   4. getting top 5 countries used for topups (amount)
                   4. getting top 5 most spending accounts
                   5. getting all transactions for past 24 hours (success / fail)
                   */
                   $pipe1 = array(
                    array(
                        '$group' => array(
                            '_id' => array('currency' => '$currency'),
                            'totalAmmount' => array('$sum' => '$balance')
                        )
                    )
                   );
                   $res = $db->accounts->aggregate($pipe1);
                  print_r($res);

                  $pipe2 = array(
                    array(
                        '$group' => array(
                            '_id' => array('country' => '$country'),
                            'count' => array('$sum' => 1)
                        )
                    ),
                    array('$sort' => array(
                        'count' => -1
                    )),
                    array('$limit' => 5)
                   );
                   $res2 = $db->topuplogs->aggregate($pipe2);

                   print_r($res2);

                   $pipe3 = array(
                    array(
                        '$group' => array(
                            '_id' => array('country' => '$country', 'currency' => '$paid_currency'),
                            'amount' => array('$sum' => '$paid_amount')
                        )
                    ),
                    array('$sort' => array(
                        'amount' => -1
                    )),
                    array('$limit' => 5)
                   );
                   $res3 = $db->topuplogs->aggregate($pipe3);

                   print_r($res3);
