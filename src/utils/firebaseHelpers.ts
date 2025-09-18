import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc,
    query, 
    orderBy, 
    where, 
    QueryConstraint,
    DocumentData,
    Query
  } from 'firebase/firestore';
  import { db } from '@/lib/firebase';
  
  /**
   * Helper functions para operações no Firebase com suporte a multi-empresa
   */
  
  // Tipo para documentos com ID
  export interface DocumentWithId {
    id: string;
    [key: string]: unknown;
  }
  
  /**
   * Cria uma referência de coleção com prefixo da empresa
   */
  export function createCollection(collectionName: string) {
    return collection(db, collectionName);
  }
  
  /**
   * Cria uma referência de documento com prefixo da empresa
   */
  export function createDocRef(collectionName: string, docId: string) {
    return doc(db, collectionName, docId);
  }
  
  /**
   * Adiciona um documento à coleção
   */
  export async function addDocument(collectionName: string, data: DocumentData) {
    try {
      const colRef = createCollection(collectionName);
      const docRef = await addDoc(colRef, {
        ...data,
        criadoEm: new Date(),
        atualizadoEm: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Erro ao adicionar documento em ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Atualiza um documento
   */
  export async function updateDocument(collectionName: string, docId: string, data: Partial<DocumentData>) {
    try {
      const docRef = createDocRef(collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        atualizadoEm: new Date()
      });
    } catch (error) {
      console.error(`Erro ao atualizar documento em ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Exclui um documento
   */
  export async function deleteDocument(collectionName: string, docId: string) {
    try {
      const docRef = createDocRef(collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Erro ao excluir documento em ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Busca um documento por ID
   */
  export async function getDocumentById(collectionName: string, docId: string): Promise<DocumentWithId | null> {
    try {
      const docRef = createDocRef(collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar documento em ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Busca todos os documentos de uma coleção
   */
  export async function getAllDocuments(
    collectionName: string, 
    constraints: QueryConstraint[] = []
  ): Promise<DocumentWithId[]> {
    try {
      const colRef = createCollection(collectionName);
      let q: Query<DocumentData>;
      
      if (constraints.length > 0) {
        q = query(colRef, ...constraints);
      } else {
        q = query(colRef, orderBy('criadoEm', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Erro ao buscar documentos em ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Busca documentos com filtros específicos
   */
  export async function getDocumentsWhere(
    collectionName: string,
    fieldPath: string,//eslint-disable-next-line
    opStr: any,//eslint-disable-next-line
    value: any,
    additionalConstraints: QueryConstraint[] = []
  ): Promise<DocumentWithId[]> {
    try {
      const colRef = createCollection(collectionName);
      const constraints = [where(fieldPath, opStr, value), ...additionalConstraints];
      const q = query(colRef, ...constraints);
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Erro ao buscar documentos com filtro em ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Função utilitária para criar queries ordenadas
   */
  export function createOrderedQuery(collectionName: string, orderField: string, direction: 'asc' | 'desc' = 'desc') {
    const colRef = createCollection(collectionName);
    return query(colRef, orderBy(orderField, direction));
  }
  
  //eslint-disable-next-line
  export function createFilteredQuery(collectionName: string, filters: Array<{field: string, operator: any, value: any}>) {
    const colRef = createCollection(collectionName);
    const constraints = filters.map(filter => where(filter.field, filter.operator, filter.value));
    return query(colRef, ...constraints);
  }
  
  // Exportar também as funções originais do Firebase para casos específicos
  export { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc,
    query, 
    orderBy, 
    where 
  } from 'firebase/firestore';